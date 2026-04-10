using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Queries.GetOrganizationReceipt;

public record GetOrganizationReceiptQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid ReceiptId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;

public class GetOrganizationReceiptHandler : IRequestHandler<GetOrganizationReceiptQuery, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetOrganizationReceiptHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(GetOrganizationReceiptQuery request, CancellationToken ct)
	{
		var isMember = await _orgAuth.IsMember(request.OrganizationId, request.CallerDomainUserId, ct);
		if (!isMember)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Немає доступу до організації");

		var receipt = await _db.Receipts
			.AsNoTracking()
			.Where(r => r.Id == request.ReceiptId && r.OrganizationId == request.OrganizationId)
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
				r.Items
					.Where(item => !item.IsDeleted)
					.OrderBy(item => item.SortOrder)
					.Select(item => new ReceiptItemDto(
						item.Id,
						item.Name,
						item.Quantity,
						item.UnitPrice,
						item.TotalPrice,
						item.Barcode,
						item.VatRate,
						item.VatAmount,
						item.SortOrder))
					.ToList(),
				r.ItemPhotos
					.Where(photo => !photo.IsDeleted)
					.OrderBy(photo => photo.SortOrder)
					.Select(photo => new ReceiptItemPhotoDto(
						photo.Id,
						photo.OriginalFileName,
						StorageUrlResolver.Resolve(_fileStorage, photo.StorageKey) ?? string.Empty,
						photo.SortOrder,
						photo.ReceiptItemId))
					.ToList(),
				r.OcrStructuredPayloadJson,
				r.RawOcrJson,
				r.StateVerificationReference,
				false))
			.FirstOrDefaultAsync(ct);

		return receipt is null
			? ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено")
			: ServiceResponse<ReceiptPipelineDto>.Success(receipt);
	}
}
