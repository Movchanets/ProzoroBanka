using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.SearchOrganizations;

public record SearchOrganizationsQuery(
	string? Query,
	int Page = 1,
	int PageSize = 12,
	bool VerifiedOnly = false,
	bool ActiveOnly = false) : IRequest<ServiceResponse<PublicListResponse<PublicOrganizationDto>>>;

public class SearchOrganizationsHandler
	: IRequestHandler<SearchOrganizationsQuery, ServiceResponse<PublicListResponse<PublicOrganizationDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public SearchOrganizationsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicListResponse<PublicOrganizationDto>>> Handle(
		SearchOrganizationsQuery request,
		CancellationToken cancellationToken)
	{
		var page = Math.Max(1, request.Page);
		var pageSize = Math.Clamp(request.PageSize, 1, 50);

		var organizationsQuery = _db.Organizations
			.AsNoTracking()
			.AsQueryable();

		if (!string.IsNullOrWhiteSpace(request.Query))
		{
			var term = request.Query.Trim();
			organizationsQuery = organizationsQuery.Where(o =>
				o.Name.Contains(term) ||
				(o.Description != null && o.Description.Contains(term)) ||
				o.Slug.Contains(term));
		}

		if (request.VerifiedOnly)
			organizationsQuery = organizationsQuery.Where(o => o.IsVerified);

		if (request.ActiveOnly)
			organizationsQuery = organizationsQuery.Where(o => o.Campaigns.Any(c => c.Status == CampaignStatus.Active));

		var totalCount = await organizationsQuery.CountAsync(cancellationToken);

		var pageItems = await organizationsQuery
			.OrderByDescending(o => o.IsVerified)
			.ThenBy(o => o.Name)
			.Skip((page - 1) * pageSize)
			.Take(pageSize)
			.Select(o => new
			{
				o.Id,
				o.Name,
				o.Slug,
				o.Description,
				o.LogoStorageKey,
				o.IsVerified,
				o.Website,
				MemberCount = o.Members.Count,
				ActiveCampaignCount = o.Campaigns.Count(c => c.Status == CampaignStatus.Active),
				TotalRaised = o.Campaigns
					.Where(c => c.Status != CampaignStatus.Draft)
					.Sum(c => (decimal?)c.CurrentAmount) ?? 0m
			})
			.ToListAsync(cancellationToken);

		var orgIds = pageItems.Select(i => i.Id).ToList();
		var teamMembers = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => orgIds.Contains(m.OrganizationId))
			.OrderBy(m => m.JoinedAt)
			.Select(m => new
			{
				m.OrganizationId,
				m.UserId,
				m.User.FirstName,
				m.User.LastName,
				m.User.ProfilePhotoStorageKey
			})
			.ToListAsync(cancellationToken);

		var teamLookup = teamMembers
			.GroupBy(m => m.OrganizationId)
			.ToDictionary(
				g => g.Key,
				g => (IReadOnlyList<PublicTeamMemberDto>)g.Take(6)
					.Select(m => new PublicTeamMemberDto(
						m.UserId,
						m.FirstName,
						m.LastName,
						StorageUrlResolver.Resolve(_fileStorage, m.ProfilePhotoStorageKey)))
					.ToList());

		var items = pageItems.Select(o => new PublicOrganizationDto(
			o.Id,
			o.Name,
			o.Slug,
			o.Description,
			StorageUrlResolver.Resolve(_fileStorage, o.LogoStorageKey),
			o.IsVerified,
			o.Website,
			o.MemberCount,
			o.ActiveCampaignCount,
			o.TotalRaised,
			teamLookup.GetValueOrDefault(o.Id, [])))
			.ToList();

		return ServiceResponse<PublicListResponse<PublicOrganizationDto>>.Success(
			new PublicListResponse<PublicOrganizationDto>(items, page, pageSize, totalCount));
	}
}
