using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.SearchPublicCampaigns;

public record SearchPublicCampaignsQuery(
	string? Query,
	CampaignStatus? Status = null,
	int Page = 1,
	int PageSize = 24,
	bool VerifiedOnly = false) : IRequest<ServiceResponse<PublicListResponse<PublicCampaignDto>>>;

public class SearchPublicCampaignsHandler
	: IRequestHandler<SearchPublicCampaignsQuery, ServiceResponse<PublicListResponse<PublicCampaignDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public SearchPublicCampaignsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicListResponse<PublicCampaignDto>>> Handle(
		SearchPublicCampaignsQuery request,
		CancellationToken cancellationToken)
	{
		var page = Math.Max(1, request.Page);
		var pageSize = Math.Clamp(request.PageSize, 1, 50);

		var query = _db.Campaigns
			.AsNoTracking()
			.Where(c => c.Status != CampaignStatus.Draft)
			.AsQueryable();

		if (request.Status.HasValue)
			query = query.Where(c => c.Status == request.Status.Value);

		if (request.VerifiedOnly)
			query = query.Where(c => c.Organization.IsVerified);

		if (!string.IsNullOrWhiteSpace(request.Query))
		{
			var term = request.Query.Trim();
			var likePattern = $"%{EscapeLikePattern(term)}%";

			// TODO: Switch to PostgreSQL FTS with ToTsVector/Matches after the Npgsql search extensions
			// are exposed in the Application layer and backed by a GIN index.
			query = query.Where(c =>
				EF.Functions.Like(c.Title, likePattern, @"\") ||
				(c.Description != null && EF.Functions.Like(c.Description, likePattern, @"\")) ||
				EF.Functions.Like(c.Organization.Name, likePattern, @"\") ||
				EF.Functions.Like(c.Organization.Slug, likePattern, @"\"));
		}

		var totalCount = await query.CountAsync(cancellationToken);
		var campaigns = await query
			.OrderByDescending(c => c.Status == CampaignStatus.Active)
			.ThenByDescending(c => c.CurrentAmount)
			.ThenByDescending(c => c.CreatedAt)
			.Skip((page - 1) * pageSize)
			.Take(pageSize)
			.Select(c => new PublicCampaignDto(
				c.Id,
				c.Title,
				c.Description,
				StorageUrlResolver.Resolve(_fileStorage, c.CoverImageStorageKey),
				c.SendUrl,
				c.GoalAmount,
				c.CurrentAmount,
				c.Status,
				c.StartDate,
				c.Deadline,
				0,
				c.Organization.Name,
				c.Organization.Slug,
				c.Organization.IsVerified))
			.ToListAsync(cancellationToken);

		return ServiceResponse<PublicListResponse<PublicCampaignDto>>.Success(
			new PublicListResponse<PublicCampaignDto>(campaigns, page, pageSize, totalCount));
	}

	private static string EscapeLikePattern(string input) =>
		input
			.Replace(@"\", @"\\", StringComparison.Ordinal)
			.Replace("%", @"\%", StringComparison.Ordinal)
			.Replace("_", @"\_", StringComparison.Ordinal);
}
