using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptOcrDraft;

public class UpdateReceiptOcrDraftHandler : IRequestHandler<UpdateReceiptOcrDraftCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public UpdateReceiptOcrDraftHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(UpdateReceiptOcrDraftCommand request, CancellationToken ct)
	{
		var normalizedPurchaseDateUtc = ReceiptMutationHelpers.NormalizeToUtc(request.PurchaseDateUtc);

		var receipt = await _db.FindWithPipelineGraphByIdAsync(request.ReceiptId, ct);

		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		var isOwner = receipt.UserId == request.CallerDomainUserId;
		if (!isOwner)
		{
			if (!receipt.OrganizationId.HasValue)
				return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

			var isOrgMember = await _orgAuth.IsMember(receipt.OrganizationId.Value, request.CallerDomainUserId, ct);
			if (!isOrgMember)
				return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");
		}

		receipt.Alias = ReceiptMutationHelpers.NormalizeNullableText(request.Alias);
		receipt.MerchantName = ReceiptMutationHelpers.NormalizeNullableText(request.MerchantName);
		receipt.TotalAmount = request.TotalAmount;
		receipt.PurchaseDateUtc = normalizedPurchaseDateUtc;
		receipt.TransactionDate = normalizedPurchaseDateUtc;
		receipt.FiscalNumber = ReceiptMutationHelpers.NormalizeNullableText(request.FiscalNumber);
		receipt.ReceiptCode = ReceiptMutationHelpers.NormalizeNullableText(request.ReceiptCode);
		receipt.Currency = ReceiptMutationHelpers.NormalizeNullableText(request.Currency);
		receipt.PurchasedItemName = ReceiptMutationHelpers.NormalizeNullableText(request.PurchasedItemName);
		receipt.OcrStructuredPayloadJson = ReceiptMutationHelpers.NormalizeNullableText(request.OcrStructuredPayloadJson);
		receipt.ParsedByModel = "manual";
		receipt.StateVerifiedAtUtc = null;
		ReceiptMutationHelpers.RefreshVerificationReference(receipt);
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

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
