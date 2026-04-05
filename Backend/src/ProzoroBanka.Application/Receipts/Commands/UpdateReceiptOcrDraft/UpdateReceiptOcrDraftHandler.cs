using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptOcrDraft;

public class UpdateReceiptOcrDraftHandler : IRequestHandler<UpdateReceiptOcrDraftCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;

	public UpdateReceiptOcrDraftHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(UpdateReceiptOcrDraftCommand request, CancellationToken ct)
	{
		var receipt = await _db.Receipts.FirstOrDefaultAsync(
			r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId,
			ct);

		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		receipt.MerchantName = Normalize(request.MerchantName);
		receipt.TotalAmount = request.TotalAmount;
		receipt.PurchaseDateUtc = request.PurchaseDateUtc;
		receipt.TransactionDate = request.PurchaseDateUtc;
		receipt.FiscalNumber = Normalize(request.FiscalNumber);
		receipt.ReceiptCode = Normalize(request.ReceiptCode);
		receipt.Currency = Normalize(request.Currency);
		receipt.PurchasedItemName = Normalize(request.PurchasedItemName);
		receipt.OcrStructuredPayloadJson = NormalizeJson(request.OcrStructuredPayloadJson);
		receipt.ParsedBy = OcrProvider.Manual;
		receipt.RegistryType = !string.IsNullOrWhiteSpace(receipt.FiscalNumber)
			? RegistryReceiptType.Fiscal
			: !string.IsNullOrWhiteSpace(receipt.ReceiptCode)
				? RegistryReceiptType.BankTransfer
				: null;

		if (receipt.Status == ReceiptStatus.InvalidData)
		{
			receipt.Status = ReceiptStatus.OcrExtracted;
			receipt.VerificationFailureReason = null;
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
			receipt.CreatedAt,
			receipt.FiscalNumber,
			receipt.ReceiptCode,
			receipt.Currency,
			receipt.PurchasedItemName,
			receipt.OcrStructuredPayloadJson,
			receipt.RawOcrJson));
	}

	private static string? Normalize(string? value) =>
		string.IsNullOrWhiteSpace(value) ? null : value.Trim();

	private static string? NormalizeJson(string? value) =>
		string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
