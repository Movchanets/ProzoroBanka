using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Queries.GetCampaignPurchases;

public class GetCampaignPurchasesHandler
	: IRequestHandler<GetCampaignPurchasesQuery, ServiceResponse<IReadOnlyList<PurchaseListItemDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetCampaignPurchasesHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<IReadOnlyList<PurchaseListItemDto>>> Handle(
		GetCampaignPurchasesQuery request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ReadOnly,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<IReadOnlyList<PurchaseListItemDto>>.Failure(authResult.Message);

		var campaignExists = await _db.Campaigns.AnyAsync(
			c => c.Id == request.CampaignId && c.OrganizationId == request.OrganizationId,
			ct);

		if (!campaignExists)
			return ServiceResponse<IReadOnlyList<PurchaseListItemDto>>.Failure("Збір не знайдено в цій організації");

		var query = _db.CampaignPurchases
			.Include(p => p.Documents)
			.Where(p => p.CampaignId == request.CampaignId)
			.AsQueryable();

		if (request.StatusFilter.HasValue)
			query = query.Where(p => p.Status == request.StatusFilter.Value);

		var purchases = await query
			.OrderByDescending(p => p.CreatedAt)
			.ToListAsync(ct);

		var result = purchases.Select(PurchaseDtoMapper.ToListItemDto).ToList();

		return ServiceResponse<IReadOnlyList<PurchaseListItemDto>>.Success(result);
	}
}
