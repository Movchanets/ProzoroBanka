using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Queries.GetMyReceipt;

public class GetMyReceiptHandler : IRequestHandler<GetMyReceiptQuery, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetMyReceiptHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(GetMyReceiptQuery request, CancellationToken ct)
	{
		var receipt = await _db.Receipts
			.AsNoTracking()
			.Where(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId)
			.Select(r => new ReceiptPipelineDto(
				r.Id,
				r.OriginalFileName,
				StorageUrlResolver.Resolve(_fileStorage, r.ReceiptImageStorageKey ?? r.StorageKey),
				r.Alias,
				r.MerchantName,
				r.TotalAmount,
				r.PurchaseDateUtc,
				r.Status,
				r.PublicationStatus,
				r.VerificationFailureReason,
				r.CreatedAt,
				r.CampaignId,
				r.Campaign != null ? r.Campaign.Title : null,
				r.FiscalNumber,
				r.ReceiptCode,
				r.Currency,
				r.PurchasedItemName,
				r.ItemPhotos
					.Where(photo => !photo.IsDeleted)
					.OrderBy(photo => photo.SortOrder)
					.Select(photo => new ReceiptItemPhotoDto(
						photo.Id,
						photo.OriginalFileName,
						StorageUrlResolver.Resolve(_fileStorage, photo.StorageKey) ?? string.Empty,
						photo.SortOrder))
					.ToList(),
				r.OcrStructuredPayloadJson,
				r.RawOcrJson,
				null,
				false))
			.FirstOrDefaultAsync(ct);

		return receipt is null
			? ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено")
			: ServiceResponse<ReceiptPipelineDto>.Success(receipt);
	}
}
