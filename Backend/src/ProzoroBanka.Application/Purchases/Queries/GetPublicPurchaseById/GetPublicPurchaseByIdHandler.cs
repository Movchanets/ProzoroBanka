using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Queries.GetPublicPurchaseById;

public class GetPublicPurchaseByIdHandler
	: IRequestHandler<GetPublicPurchaseByIdQuery, ServiceResponse<PurchaseDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicPurchaseByIdHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PurchaseDetailDto>> Handle(GetPublicPurchaseByIdQuery request, CancellationToken ct)
	{
		var purchase = await _db.CampaignPurchases
			.AsNoTracking()
			.Include(p => p.Documents)
			.Include(p => p.Campaign)
			.FirstOrDefaultAsync(p => p.Id == request.PurchaseId, ct);

		if (purchase is null)
			return ServiceResponse<PurchaseDetailDto>.Failure("Витрату не знайдено");

		if (purchase.Status == PurchaseStatus.Cancelled)
			return ServiceResponse<PurchaseDetailDto>.Failure("Витрату не знайдено");

		if (!purchase.CampaignId.HasValue || purchase.Campaign is null || purchase.Campaign.Status == CampaignStatus.Draft)
			return ServiceResponse<PurchaseDetailDto>.Failure("Витрату не знайдено");

		var dto = new PurchaseDetailDto(
			purchase.Id,
			purchase.CampaignId,
			purchase.CreatedByUserId,
			purchase.Title,
			purchase.Description,
			purchase.TotalAmount,
			purchase.Status,
			purchase.Documents
				.Where(d => !d.IsDeleted)
				.OrderBy(d => d.CreatedAt)
				.Select(d => PurchaseDtoMapper.ToPublicDocumentDto(_fileStorage, d))
				.ToList(),
			purchase.CreatedAt);

		return ServiceResponse<PurchaseDetailDto>.Success(dto);
	}
}
