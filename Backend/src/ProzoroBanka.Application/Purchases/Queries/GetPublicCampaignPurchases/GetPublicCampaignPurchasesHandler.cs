using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Queries.GetPublicCampaignPurchases;

public class GetPublicCampaignPurchasesHandler
	: IRequestHandler<GetPublicCampaignPurchasesQuery, ServiceResponse<IReadOnlyList<PurchaseDetailDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicCampaignPurchasesHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<PurchaseDetailDto>>> Handle(
		GetPublicCampaignPurchasesQuery request, CancellationToken ct)
	{
		var campaignExists = await _db.Campaigns.AnyAsync(c => c.Id == request.CampaignId, ct);
		if (!campaignExists)
			return ServiceResponse<IReadOnlyList<PurchaseDetailDto>>.Failure("Збір не знайдено");

		var purchases = await _db.CampaignPurchases
			.Include(p => p.Documents)
			.Where(p => p.CampaignId == request.CampaignId && p.Status != PurchaseStatus.Cancelled)
			.OrderByDescending(p => p.CreatedAt)
			.ToListAsync(ct);

		var result = purchases.Select(p => new PurchaseDetailDto(
			p.Id,
			p.CampaignId,
			p.CreatedByUserId,
			p.Title,
			p.Description,
			p.TotalAmount,
			p.Status,
			p.Documents
				.Where(d => !d.IsDeleted)
				.OrderBy(d => d.CreatedAt)
				.Select(d => PurchaseDtoMapper.ToPublicDocumentDto(_fileStorage, d))
				.ToList(),
			p.CreatedAt
		)).ToList();

		return ServiceResponse<IReadOnlyList<PurchaseDetailDto>>.Success(result);
	}
}
