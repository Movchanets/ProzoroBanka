using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Queries.GetOrganizationCampaigns;

public record GetOrganizationCampaignsQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	CampaignStatus? StatusFilter = null) : IRequest<ServiceResponse<IReadOnlyList<CampaignDto>>>;

public class GetOrganizationCampaignsHandler
	: IRequestHandler<GetOrganizationCampaignsQuery, ServiceResponse<IReadOnlyList<CampaignDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public GetOrganizationCampaignsHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<CampaignDto>>> Handle(
		GetOrganizationCampaignsQuery request, CancellationToken cancellationToken)
	{
		var orgExists = await _db.Organizations
			.AnyAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (!orgExists)
			return ServiceResponse<IReadOnlyList<CampaignDto>>.Failure("Організацію не знайдено");

		var isMember = await _orgAuth.IsMember(
			request.OrganizationId, request.CallerDomainUserId, cancellationToken);

		if (!isMember)
			return ServiceResponse<IReadOnlyList<CampaignDto>>.Failure("Немає доступу до організації");

		var query = _db.Campaigns
			.AsNoTracking()
			.Where(c => c.OrganizationId == request.OrganizationId);

		if (request.StatusFilter.HasValue)
			query = query.Where(c => c.Status == request.StatusFilter.Value);

		var campaigns = await query
			.OrderByDescending(c => c.CreatedAt)
			.Select(c => new
			{
				c.Id,
				c.Title,
				c.Description,
				c.CoverImageStorageKey,
				c.GoalAmount,
				c.CurrentAmount,
				WithdrawnAmount = _db.CampaignTransactions
					.Where(t => t.CampaignId == c.Id && t.Amount < 0)
					.Sum(t => (decimal?)(-t.Amount)) ?? 0,
				c.Status,
				c.StartDate,
				c.Deadline,
				c.MonobankAccountId,
				c.SendUrl,
				c.CreatedAt
			})
			.ToListAsync(cancellationToken);

		var result = campaigns.Select(c => new CampaignDto(
			c.Id, c.Title, c.Description,
			StorageUrlResolver.Resolve(_fileStorage, c.CoverImageStorageKey),
			c.GoalAmount, c.CurrentAmount, c.WithdrawnAmount,
			c.Status, c.StartDate, c.Deadline,
			c.MonobankAccountId, c.SendUrl, c.CreatedAt))
			.ToList();

		return ServiceResponse<IReadOnlyList<CampaignDto>>.Success(result);
	}
}
