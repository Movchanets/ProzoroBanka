using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Queries.GetCampaignStats;

public record GetCampaignStatsQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse<CampaignStatsDto>>;

public class GetCampaignStatsHandler
	: IRequestHandler<GetCampaignStatsQuery, ServiceResponse<CampaignStatsDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetCampaignStatsHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<CampaignStatsDto>> Handle(
		GetCampaignStatsQuery request, CancellationToken cancellationToken)
	{
		var orgExists = await _db.Organizations
			.AnyAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (!orgExists)
			return ServiceResponse<CampaignStatsDto>.Failure("Організацію не знайдено");

		var isMember = await _orgAuth.IsMember(
			request.OrganizationId, request.CallerDomainUserId, cancellationToken);

		if (!isMember)
			return ServiceResponse<CampaignStatsDto>.Failure("Немає доступу до організації");

		var memberIds = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == request.OrganizationId && !m.IsDeleted)
			.Select(m => m.UserId)
			.ToListAsync(cancellationToken);

		var totalDocumented = await _db.Receipts
			.AsNoTracking()
			.Where(r => memberIds.Contains(r.UserId) && r.Status == ReceiptStatus.StateVerified)
			.SumAsync(r => r.TotalAmount ?? 0, cancellationToken);

		var stats = await _db.Campaigns
			.AsNoTracking()
			.Where(c => c.OrganizationId == request.OrganizationId)
			.GroupBy(_ => 1)
			.Select(g => new CampaignStatsDto(
				g.Count(),
				g.Count(c => c.Status == CampaignStatus.Active),
				g.Sum(c => c.CurrentAmount),
				0,
				0))
			.FirstOrDefaultAsync(cancellationToken);

		if (stats is null)
			return ServiceResponse<CampaignStatsDto>.Success(new CampaignStatsDto(0, 0, 0, 0, 0));

		var boundedDocumented = Math.Min(stats.TotalRaised, totalDocumented);
		var documentationPercent = stats.TotalRaised <= 0
			? 0
			: Math.Min(100, (double)(boundedDocumented / stats.TotalRaised * 100));

		return ServiceResponse<CampaignStatsDto>.Success(
			new CampaignStatsDto(
				stats.TotalCampaigns,
				stats.ActiveCampaigns,
				stats.TotalRaised,
				boundedDocumented,
				documentationPercent));
	}
}
