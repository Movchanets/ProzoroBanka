using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
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
		var receipt = await _db.Receipts
			.Include(r => r.ItemPhotos)
			.FirstOrDefaultAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);
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

		request.FileStream.Position = 0;
		var extraction = await _extractionService.ExtractAsync(request.FileStream, request.FileName, request.ModelIdentifier, ct);
		var normalizedPurchaseDateUtc = NormalizeToUtc(extraction.PurchaseDateUtc);
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

		if (extraction.Success)
		{
			receipt.Status = ReceiptStatus.OcrExtracted;
			receipt.VerificationFailureReason = null;
		}
		else
		{
			receipt.Status = ReceiptStatus.InvalidData;
			receipt.VerificationFailureReason = extraction.ErrorMessage ?? "Не вдалося витягнути дані з чека";
		}

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}

	private static DateTime? NormalizeToUtc(DateTime? value)
	{
		if (!value.HasValue)
			return null;

		var dateTime = value.Value;
		return dateTime.Kind switch
		{
			DateTimeKind.Utc => dateTime,
			DateTimeKind.Local => dateTime.ToUniversalTime(),
			_ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
		};
	}

	private static decimal? NormalizeToKopecks(decimal? value)
	{
		if (!value.HasValue)
			return null;

		return Math.Round(value.Value * 100m, 0, MidpointRounding.AwayFromZero);
	}
}
