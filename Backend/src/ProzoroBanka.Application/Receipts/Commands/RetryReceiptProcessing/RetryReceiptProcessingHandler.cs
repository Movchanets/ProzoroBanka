using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.RetryReceiptProcessing;

public class RetryReceiptProcessingHandler : IRequestHandler<RetryReceiptProcessingCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public RetryReceiptProcessingHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(RetryReceiptProcessingCommand request, CancellationToken ct)
	{
		var receiptAccess = await _db.FindManageableOrganizationReceiptAsync(
			_orgAuth,
			request.ReceiptId,
			request.CallerDomainUserId,
			expectedOrganizationId: null,
			ct);

		if (!receiptAccess.IsSuccess)
			return ServiceResponse<ReceiptPipelineDto>.Failure(receiptAccess.Message);

		var receipt = receiptAccess.Payload!;

		var canRetry = receipt.Status is ReceiptStatus.FailedVerification
			or ReceiptStatus.InvalidData
			or ReceiptStatus.OcrDeferredMonthlyQuota
			or ReceiptStatus.ValidationDeferredRateLimit;

		if (!canRetry)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Повторна обробка недоступна для поточного статусу");

		receipt.Status = ReceiptStatus.PendingOcr;
		receipt.VerificationFailureReason = null;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
