using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Public.Queries.SearchOrganizations;

internal sealed record SearchOrganizationListItem(
	Guid Id,
	string Name,
	string Slug,
	string? Description,
	string? LogoStorageKey,
	bool IsVerified,
	string? Website,
	int MemberCount,
	int ActiveCampaignCount,
	long TotalRaised);

public record SearchOrganizationsQuery(
	string? Query,
	int Page = 1,
	int PageSize = 12,
	bool VerifiedOnly = false,
	bool ActiveOnly = false,
	string? SortBy = null) : IRequest<ServiceResponse<PublicListResponse<PublicOrganizationDto>>>;

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
			.Where(o => !o.IsDeleted && !o.IsBlocked)
			.AsQueryable();

		if (!string.IsNullOrWhiteSpace(request.Query))
		{
			var term = request.Query.Trim();
			var likePattern = $"%{EscapeLikePattern(term)}%";

			// TODO: Switch this to PostgreSQL full-text search via
			// EF.Functions.ToTsVector("simple", o.Name + " " + o.Description).Matches(...)
			// after exposing Npgsql FTS extensions to the Application project and adding a GIN index.
			organizationsQuery = organizationsQuery.Where(o =>
				EF.Functions.Like(o.Name, likePattern, @"\") ||
				(o.Description != null && EF.Functions.Like(o.Description, likePattern, @"\")) ||
				EF.Functions.Like(o.Slug, likePattern, @"\"));
		}

		if (request.VerifiedOnly)
			organizationsQuery = organizationsQuery.Where(o => o.IsVerified);

		if (request.ActiveOnly)
			organizationsQuery = organizationsQuery.Where(o =>
				_db.Campaigns.Any(c => c.OrganizationId == o.Id && c.Status == CampaignStatus.Active));

		// TODO: For high-traffic listing pages, denormalize ActiveCampaignCount/TotalRaised/MemberCount
		// onto Organization (or a dedicated read model) to avoid repeated correlated aggregates in ORDER BY.

		var totalCount = await organizationsQuery.CountAsync(cancellationToken);

		var sortedQuery = ApplySorting(organizationsQuery, request.SortBy);

		var pageItems = await sortedQuery
			.Skip((page - 1) * pageSize)
			.Take(pageSize)
			.Select(o => new SearchOrganizationListItem(
				o.Id,
				o.Name,
				o.Slug,
				o.Description,
				o.LogoStorageKey,
				o.IsVerified,
				o.Website,
				_db.OrganizationMembers.Count(m => m.OrganizationId == o.Id),
				_db.Campaigns.Count(c => c.OrganizationId == o.Id && c.Status == CampaignStatus.Active),
				_db.Campaigns
					.Where(c => c.OrganizationId == o.Id && c.Status != CampaignStatus.Draft)
					.Sum(c => (long?)c.CurrentAmount) ?? 0L))
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
						_fileStorage.ResolvePublicUrl(m.ProfilePhotoStorageKey)))
					.ToList());

		var items = pageItems.Select(o => new PublicOrganizationDto(
			o.Id,
			o.Name,
			o.Slug,
			o.Description,
			_fileStorage.ResolvePublicUrl(o.LogoStorageKey),
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

	private IQueryable<Organization> ApplySorting(
		IQueryable<Organization> query,
		string? sortBy)
	{
		var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

		return normalizedSortBy switch
		{
			"verified" => query
				.OrderByDescending(o => o.IsVerified)
				.ThenByDescending(o => _db.Campaigns.Count(c => c.OrganizationId == o.Id && c.Status == CampaignStatus.Active))
				.ThenByDescending(o => _db.Campaigns
					.Where(c => c.OrganizationId == o.Id && c.Status != CampaignStatus.Draft)
					.Sum(c => (long?)c.CurrentAmount) ?? 0L)
				.ThenBy(o => o.Name),
			"totalraised" or "raised" => query
				.OrderByDescending(o => _db.Campaigns
					.Where(c => c.OrganizationId == o.Id && c.Status != CampaignStatus.Draft)
					.Sum(c => (long?)c.CurrentAmount) ?? 0L)
				.ThenByDescending(o => _db.Campaigns.Count(c => c.OrganizationId == o.Id && c.Status == CampaignStatus.Active))
				.ThenByDescending(o => o.IsVerified)
				.ThenBy(o => o.Name),
			"activecampaigns" or "activecampaigncount" or "active" => query
				.OrderByDescending(o => _db.Campaigns.Count(c => c.OrganizationId == o.Id && c.Status == CampaignStatus.Active))
				.ThenByDescending(o => _db.Campaigns
					.Where(c => c.OrganizationId == o.Id && c.Status != CampaignStatus.Draft)
					.Sum(c => (long?)c.CurrentAmount) ?? 0L)
				.ThenByDescending(o => o.IsVerified)
				.ThenBy(o => o.Name),
			_ => query
				.OrderByDescending(o => _db.Campaigns.Count(c => c.OrganizationId == o.Id && c.Status == CampaignStatus.Active))
				.ThenByDescending(o => _db.Campaigns
					.Where(c => c.OrganizationId == o.Id && c.Status != CampaignStatus.Draft)
					.Sum(c => (long?)c.CurrentAmount) ?? 0L)
				.ThenByDescending(o => o.IsVerified)
				.ThenBy(o => o.Name)
		};
	}

	private static string EscapeLikePattern(string input) =>
		input
			.Replace(@"\", @"\\", StringComparison.Ordinal)
			.Replace("%", @"\%", StringComparison.Ordinal)
			.Replace("_", @"\_", StringComparison.Ordinal);
}
