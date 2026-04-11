using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Hosted service that reads from <see cref="OcrProcessingQueue"/> and performs OCR extraction
/// in the background, updating receipt status in the database.
/// </summary>
public class OcrBackgroundWorker : BackgroundService
{
	private readonly OcrProcessingQueue _queue;
	private readonly IServiceScopeFactory _scopeFactory;
	private readonly ILogger<OcrBackgroundWorker> _logger;

	public OcrBackgroundWorker(
		OcrProcessingQueue queue,
		IServiceScopeFactory scopeFactory,
		ILogger<OcrBackgroundWorker> logger)
	{
		_queue = queue;
		_scopeFactory = scopeFactory;
		_logger = logger;
	}

	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		_logger.LogInformation("OCR Background Worker started");

		await foreach (var item in _queue.ReadAllAsync(stoppingToken))
		{
			try
			{
				await ProcessItemAsync(item, stoppingToken);
			}
			catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
			{
				break;
			}
			catch (Exception ex)
			{
				_logger.LogError(ex,
					"OCR Background Worker failed for ReceiptId={ReceiptId}",
					item.ReceiptId);
			}
		}

		_logger.LogInformation("OCR Background Worker stopped");
	}

	private async Task ProcessItemAsync(OcrWorkItem item, CancellationToken ct)
	{
		using var scope = _scopeFactory.CreateScope();
		var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
		var extractionService = scope.ServiceProvider.GetRequiredService<IReceiptStructuredExtractionService>();
		var fileStorage = scope.ServiceProvider.GetRequiredService<IFileStorage>();

		var receipt = await db.Receipts
			.Include(r => r.Items)
			.Include(r => r.ItemPhotos)
			.FirstOrDefaultAsync(r => r.Id == item.ReceiptId && r.UserId == item.CallerUserId, ct);

		if (receipt is null)
		{
			_logger.LogWarning("OCR Worker: receipt {ReceiptId} not found or not owned by {UserId}",
				item.ReceiptId, item.CallerUserId);
			return;
		}

		var storageKey = receipt.ReceiptImageStorageKey ?? receipt.StorageKey;
		if (string.IsNullOrWhiteSpace(storageKey))
		{
			receipt.Status = ReceiptStatus.InvalidData;
			receipt.VerificationFailureReason = "Для OCR потрібен файл чека";
			await db.SaveChangesAsync(ct);
			return;
		}

		Stream? stream = null;
		try
		{
			stream = await fileStorage.OpenReadAsync(storageKey, ct);
			var fileName = receipt.OriginalFileName
				?? Path.GetFileName(storageKey)
				?? "receipt.webp";

			var extraction = await extractionService.ExtractAsync(stream, fileName, item.ModelIdentifier, ct);
			var normalizedPurchaseDateUtc = ReceiptMutationHelpers.NormalizeToUtc(extraction.PurchaseDateUtc);
			var normalizedTotalAmount = extraction.TotalAmount.HasValue
				? Math.Round(extraction.TotalAmount.Value * 100m, 0, MidpointRounding.AwayFromZero)
				: (decimal?)null;

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
					var existingItems = receipt.Items.Where(i => !i.IsDeleted).ToList();
					if (existingItems.Count > 0)
						db.ReceiptItems.RemoveRange(existingItems);
					db.ReceiptItems.AddRange(extractedItems);
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
			await db.SaveChangesAsync(ct);

			_logger.LogInformation(
				"OCR Worker completed for ReceiptId={ReceiptId}, Status={Status}",
				receipt.Id, receipt.Status);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "OCR Worker extraction failed for ReceiptId={ReceiptId}", item.ReceiptId);

			receipt.Status = ReceiptStatus.InvalidData;
			receipt.VerificationFailureReason = $"OCR помилка: {ex.Message}";
			await db.SaveChangesAsync(ct);
		}
		finally
		{
			if (stream is not null)
				await stream.DisposeAsync();
		}
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
					Barcode = GetString(itemElement, "barcode")?.Trim(),
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

	private static decimal? NormalizeToKopecks(decimal? value)
	{
		if (!value.HasValue) return null;
		return Math.Round(value.Value * 100m, 0, MidpointRounding.AwayFromZero);
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
			if (decimal.TryParse(value?.Replace(',', '.'),
				System.Globalization.NumberStyles.Number,
				System.Globalization.CultureInfo.InvariantCulture, out var parsedValue))
				return parsedValue;
		}

		return null;
	}
}
