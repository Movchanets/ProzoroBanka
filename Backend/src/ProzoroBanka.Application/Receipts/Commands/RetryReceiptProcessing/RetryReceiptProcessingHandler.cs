using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.RetryReceiptProcessing;

public class RetryReceiptProcessingHandler : IRequestHandler<RetryReceiptProcessingCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;

	public RetryReceiptProcessingHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(RetryReceiptProcessingCommand request, CancellationToken ct)
	{
		var receipt = await _db.Receipts.FirstOrDefaultAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);
		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		var canRetry = receipt.Status is ReceiptStatus.FailedVerification
			or ReceiptStatus.InvalidData
			or ReceiptStatus.OcrDeferredMonthlyQuota
			or ReceiptStatus.ValidationDeferredRateLimit;

		if (!canRetry)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Повторна обробка недоступна для поточного статусу");

		receipt.Status = ReceiptStatus.PendingOcr;
		receipt.VerificationFailureReason = null;
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
			receipt.CreatedAt,
			receipt.FiscalNumber,
			receipt.ReceiptCode,
			receipt.Currency,
			receipt.PurchasedItemName,
			receipt.OcrStructuredPayloadJson,
			receipt.RawOcrJson));
	}
}
