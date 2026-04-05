using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.UploadReceiptDraft;

public class UploadReceiptDraftHandler : IRequestHandler<UploadReceiptDraftCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public UploadReceiptDraftHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(UploadReceiptDraftCommand request, CancellationToken ct)
	{
		var userExists = await _db.Users.AnyAsync(u => u.Id == request.CallerDomainUserId, ct);
		if (!userExists)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Користувача не знайдено");

		request.FileStream.Position = 0;
		var storageKey = await _fileStorage.UploadAsync(request.FileStream, request.FileName, request.ContentType, ct);

		var receipt = new Receipt
		{
			UserId = request.CallerDomainUserId,
			StorageKey = storageKey,
			ReceiptImageStorageKey = storageKey,
			OriginalFileName = request.FileName,
			Status = ReceiptStatus.PendingOcr,
			PublicationStatus = ReceiptPublicationStatus.Draft
		};

		_db.Receipts.Add(receipt);
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
