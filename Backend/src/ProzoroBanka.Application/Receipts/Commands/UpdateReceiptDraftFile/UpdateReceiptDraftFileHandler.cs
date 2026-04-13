using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptDraftFile;

public class UpdateReceiptDraftFileHandler : IRequestHandler<UpdateReceiptDraftFileCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public UpdateReceiptDraftFileHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(UpdateReceiptDraftFileCommand request, CancellationToken ct)
	{
		var receipt = await _db.FindAccessibleWithPipelineGraphAsync(_orgAuth, request.ReceiptId, request.CallerDomainUserId, ct);

		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		var previousStorageKey = receipt.StorageKey;

		request.FileStream.Position = 0;
		var storageKey = await _fileStorage.UploadAsync(request.FileStream, request.FileName, request.ContentType, ct);

		receipt.StorageKey = storageKey;
		receipt.ReceiptImageStorageKey = storageKey;
		receipt.OriginalFileName = request.FileName;
		receipt.Status = ReceiptStatus.PendingOcr;
		receipt.VerificationFailureReason = null;
		receipt.RawOcrJson = null;
		receipt.OcrStructuredPayloadJson = null;
		receipt.OcrExtractedAtUtc = null;
		receipt.StateVerifiedAtUtc = null;
		receipt.StateVerificationReference = null;
		receipt.MerchantName = null;
		receipt.TotalAmount = null;
		receipt.PurchaseDateUtc = null;
		receipt.TransactionDate = null;
		receipt.FiscalNumber = null;
		receipt.ReceiptCode = null;
		receipt.Currency = null;
		receipt.PurchasedItemName = null;

		await _db.SaveChangesAsync(ct);

		if (!string.IsNullOrWhiteSpace(previousStorageKey) && !string.Equals(previousStorageKey, storageKey, StringComparison.Ordinal))
		{
			try
			{
				await _fileStorage.DeleteAsync(previousStorageKey, ct);
			}
			catch
			{
				// Do not fail the request if old preview cleanup fails.
			}
		}

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
