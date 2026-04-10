using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;

public class ExtractReceiptDataHandler : IRequestHandler<ExtractReceiptDataCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IReceiptStructuredExtractionService _extractionService;
	private readonly IOcrMonthlyQuotaService _ocrQuotaService;
	private readonly IFileStorage _fileStorage;

	public ExtractReceiptDataHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IReceiptStructuredExtractionService extractionService,
		IOcrMonthlyQuotaService ocrQuotaService,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_extractionService = extractionService;
		_ocrQuotaService = ocrQuotaService;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ExtractReceiptDataCommand request, CancellationToken ct)
	{
		var receipt = await _db.FindOwnedWithPipelineGraphAsync(request.ReceiptId, request.CallerDomainUserId, ct);
		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		var isMember = await _orgAuth.IsMember(request.OrganizationId, request.CallerDomainUserId, ct);
		if (!isMember)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Користувач не є учасником організації");

		var quota = await _ocrQuotaService.TryConsumeAsync(request.OrganizationId, DateTime.UtcNow, ct);
		if (!quota.Allowed)
		{
			receipt.Status = ReceiptStatus.OcrDeferredMonthlyQuota;
			receipt.VerificationFailureReason = quota.Reason ?? "Місячний ліміт OCR вичерпано";
			await _db.SaveChangesAsync(ct);

			return ServiceResponse<ReceiptPipelineDto>.Failure(receipt.VerificationFailureReason);
		}

		var fileName = ResolveFileName(request.FileName, receipt);
		var streamToProcess = request.FileStream;
		Stream? openedStorageStream = null;

		if (streamToProcess is null)
		{
			if (string.IsNullOrWhiteSpace(receipt.ReceiptImageStorageKey) && string.IsNullOrWhiteSpace(receipt.StorageKey))
				return ServiceResponse<ReceiptPipelineDto>.Failure("Для OCR потрібен файл чека");

			var storageKey = receipt.ReceiptImageStorageKey ?? receipt.StorageKey;
			try
			{
				openedStorageStream = await _fileStorage.OpenReadAsync(storageKey, ct);
				streamToProcess = openedStorageStream;
			}
			catch
			{
				return ServiceResponse<ReceiptPipelineDto>.Failure("Не вдалося завантажити файл чека зі сховища");
			}
		}

		if (streamToProcess is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Для OCR потрібен файл чека");

		try
		{
			if (streamToProcess.CanSeek)
				streamToProcess.Position = 0;

			var extraction = await _extractionService.ExtractAsync(streamToProcess, fileName, request.ModelIdentifier, ct);
			var normalizedPurchaseDateUtc = ReceiptMutationHelpers.NormalizeToUtc(extraction.PurchaseDateUtc);
			var normalizedTotalAmount = NormalizeToKopecks(extraction.TotalAmount);

			receipt.MerchantName = extraction.MerchantName;
			receipt.TotalAmount = normalizedTotalAmount;
			receipt.PurchaseDateUtc = normalizedPurchaseDateUtc;
			receipt.TransactionDate = normalizedPurchaseDateUtc;
			receipt.FiscalNumber = extraction.FiscalRegisterNumber ?? extraction.FiscalNumber;
			receipt.ReceiptCode = extraction.ReceiptCode;
			receipt.Currency = extraction.Currency;
			receipt.PurchasedItemName = extraction.PurchasedItemName;
			receipt.OcrStructuredPayloadJson = extraction.StructuredPayloadJson;
			receipt.RawOcrJson = extraction.RawPayloadJson;
			receipt.OcrExtractedAtUtc = DateTime.UtcNow;
			receipt.ParsedByModel = extraction.UsedModel;
			receipt.StateVerifiedAtUtc = null;

			if (extraction.Success)
			{
				var extractedItems = ParseItemsFromStructuredPayload(extraction.StructuredPayloadJson, receipt.Id);
				if (extractedItems.Count > 0)
				{
					var existingItems = receipt.Items.Where(item => !item.IsDeleted).ToList();
					if (existingItems.Count > 0)
						_db.ReceiptItems.RemoveRange(existingItems);

					_db.ReceiptItems.AddRange(extractedItems);
				}

				receipt.Status = ReceiptStatus.OcrExtracted;
				receipt.VerificationFailureReason = null;
			}
			else
			{
				receipt.Status = ReceiptStatus.InvalidData;
				receipt.VerificationFailureReason = extraction.ErrorMessage ?? "Не вдалося витягнути дані з чека";
			}

			ReceiptMutationHelpers.RefreshVerificationReference(receipt);

			await _db.SaveChangesAsync(ct);

			return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
		}
		finally
		{
			if (openedStorageStream is not null)
				await openedStorageStream.DisposeAsync();
		}
	}

	private static string ResolveFileName(string? requestFileName, Domain.Entities.Receipt receipt)
	{
		if (!string.IsNullOrWhiteSpace(requestFileName))
			return requestFileName;

		if (!string.IsNullOrWhiteSpace(receipt.OriginalFileName))
			return receipt.OriginalFileName;

		var storageKey = receipt.ReceiptImageStorageKey ?? receipt.StorageKey;
		if (!string.IsNullOrWhiteSpace(storageKey))
			return Path.GetFileName(storageKey);

		return "receipt.webp";
	}

	private static decimal? NormalizeToKopecks(decimal? value)
	{
		if (!value.HasValue)
			return null;

		return Math.Round(value.Value * 100m, 0, MidpointRounding.AwayFromZero);
	}

	private static List<Domain.Entities.ReceiptItem> ParseItemsFromStructuredPayload(string? structuredPayloadJson, Guid receiptId)
	{
		var items = new List<Domain.Entities.ReceiptItem>();
		if (string.IsNullOrWhiteSpace(structuredPayloadJson))
			return items;

		try
		{
			using var document = JsonDocument.Parse(structuredPayloadJson);
			if (!document.RootElement.TryGetProperty("items", out var itemsElement) || itemsElement.ValueKind != JsonValueKind.Array)
				return items;

			var index = 0;
			foreach (var itemElement in itemsElement.EnumerateArray())
			{
				var name = GetString(itemElement, "name") ?? GetString(itemElement, "item_name") ?? GetString(itemElement, "title");
				if (string.IsNullOrWhiteSpace(name))
					continue;

				var quantity = GetDecimal(itemElement, "quantity");
				var unitPrice = NormalizeToKopecks(GetDecimal(itemElement, "unit_price") ?? GetDecimal(itemElement, "unitPrice"));
				var totalPrice = NormalizeToKopecks(GetDecimal(itemElement, "total_price") ?? GetDecimal(itemElement, "totalPrice"));
				var vatRate = GetDecimal(itemElement, "vat_rate") ?? GetDecimal(itemElement, "vatRate");
				var vatAmount = NormalizeToKopecks(GetDecimal(itemElement, "vat_amount") ?? GetDecimal(itemElement, "vatAmount"));

				items.Add(new Domain.Entities.ReceiptItem
				{
					ReceiptId = receiptId,
					Name = name.Trim(),
					Quantity = quantity,
					UnitPrice = unitPrice,
					TotalPrice = totalPrice,
					Barcode = NormalizeString(GetString(itemElement, "barcode")),
					VatRate = vatRate,
					VatAmount = vatAmount,
					SortOrder = index,
				});

				index++;
			}
		}
		catch
		{
			return new List<Domain.Entities.ReceiptItem>();
		}

		return items;
	}

	private static string? GetString(JsonElement element, string propertyName)
	{
		if (!element.TryGetProperty(propertyName, out var property) || property.ValueKind != JsonValueKind.String)
			return null;

		return property.GetString();
	}

	private static decimal? GetDecimal(JsonElement element, string propertyName)
	{
		if (!element.TryGetProperty(propertyName, out var property))
			return null;

		if (property.ValueKind == JsonValueKind.Number && property.TryGetDecimal(out var numberValue))
			return numberValue;

		if (property.ValueKind == JsonValueKind.String)
		{
			var value = property.GetString();
			if (decimal.TryParse(value?.Replace(',', '.'), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var parsedValue))
				return parsedValue;
		}

		return null;
	}

	private static string? NormalizeString(string? value)
	{
		if (string.IsNullOrWhiteSpace(value))
			return null;

		return value.Trim();
	}
}
