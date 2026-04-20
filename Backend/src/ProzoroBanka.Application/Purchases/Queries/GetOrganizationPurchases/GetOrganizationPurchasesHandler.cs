using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Queries.GetOrganizationPurchases;

public class GetOrganizationPurchasesHandler
	: IRequestHandler<GetOrganizationPurchasesQuery, ServiceResponse<IReadOnlyList<PurchaseListItemDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetOrganizationPurchasesHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<IReadOnlyList<PurchaseListItemDto>>> Handle(
		GetOrganizationPurchasesQuery request,
		CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<IReadOnlyList<PurchaseListItemDto>>.Failure(authResult.Message);

		var query = _db.CampaignPurchases
			.Include(p => p.Documents)
			.Where(p => p.OrganizationId == request.OrganizationId)
			.AsQueryable();

		if (request.OnlyUnattached)
		{
			query = query.Where(p => p.CampaignId == null);
		}

		if (request.StatusFilter.HasValue)
		{
			query = query.Where(p => p.Status == request.StatusFilter.Value);
		}

		var purchases = await query
			.OrderByDescending(p => p.CreatedAt)
			.ToListAsync(ct);

		var result = purchases.Select(PurchaseDtoMapper.ToListItemDto).ToList();

		return ServiceResponse<IReadOnlyList<PurchaseListItemDto>>.Success(result);
	}
}
