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

	public ExtractReceiptDataHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IReceiptStructuredExtractionService extractionService,
		IOcrMonthlyQuotaService ocrQuotaService)
	{
		_db = db;
		_orgAuth = orgAuth;
		_extractionService = extractionService;
		_ocrQuotaService = ocrQuotaService;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ExtractReceiptDataCommand request, CancellationToken ct)
	{
		var receipt = await _db.Receipts.FirstOrDefaultAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);
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
		var extraction = await _extractionService.ExtractAsync(request.FileStream, request.FileName, ct);

		receipt.MerchantName = extraction.MerchantName;
		receipt.TotalAmount = extraction.TotalAmount;
		receipt.PurchaseDateUtc = extraction.PurchaseDateUtc;
		receipt.TransactionDate = extraction.PurchaseDateUtc;
		receipt.FiscalNumber = extraction.FiscalNumber;
		receipt.ReceiptCode = extraction.ReceiptCode;
		receipt.Currency = extraction.Currency;
		receipt.PurchasedItemName = extraction.PurchasedItemName;
		receipt.OcrStructuredPayloadJson = extraction.StructuredPayloadJson;
		receipt.RawOcrJson = extraction.RawPayloadJson;
		receipt.OcrExtractedAtUtc = DateTime.UtcNow;

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

		return ServiceResponse<ReceiptPipelineDto>.Success(new ReceiptPipelineDto(
			receipt.Id,
			receipt.OriginalFileName,
			receipt.MerchantName,
			receipt.TotalAmount,
			receipt.PurchaseDateUtc,
			receipt.Status,
			receipt.PublicationStatus,
			receipt.VerificationFailureReason,
			receipt.CreatedAt));
	}
}
