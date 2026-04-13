using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetPublicOrganizationCampaigns;

public record GetPublicOrganizationCampaignsQuery(
	string Slug,
	CampaignStatus? Status = null,
	int Page = 1,
	int PageSize = 12) : IRequest<ServiceResponse<PublicListResponse<PublicCampaignDto>>>;

public class GetPublicOrganizationCampaignsHandler
	: IRequestHandler<GetPublicOrganizationCampaignsQuery, ServiceResponse<PublicListResponse<PublicCampaignDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicOrganizationCampaignsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicListResponse<PublicCampaignDto>>> Handle(
		GetPublicOrganizationCampaignsQuery request,
		CancellationToken cancellationToken)
	{
		var page = Math.Max(1, request.Page);
		var pageSize = Math.Clamp(request.PageSize, 1, 50);

		var org = await _db.Organizations
			.AsNoTracking()
			.Where(o => o.Slug == request.Slug)
			.Select(o => new { o.Id, o.Name, o.Slug, o.IsVerified })
			.FirstOrDefaultAsync(cancellationToken);

		if (org is null)
			return ServiceResponse<PublicListResponse<PublicCampaignDto>>.Failure("Організацію не знайдено");

		var query = _db.Campaigns
			.AsNoTracking()
			.Where(c => c.OrganizationId == org.Id && c.Status != CampaignStatus.Draft)
			.AsQueryable();

		if (request.Status.HasValue)
			query = query.Where(c => c.Status == request.Status.Value);

		var totalCount = await query.CountAsync(cancellationToken);
		var campaignRows = await query
			.OrderByDescending(c => c.Status == CampaignStatus.Active)
			.ThenByDescending(c => c.CreatedAt)
			.Skip((page - 1) * pageSize)
			.Take(pageSize)
			.Select(c => new
			{
				c.Id,
				c.TitleUk,
				c.TitleEn,
				c.Description,
				c.CoverImageStorageKey,
				c.SendUrl,
				c.GoalAmount,
				c.CurrentAmount,
				DocumentedAmountRaw = _db.Receipts
					.Where(r => r.CampaignId == c.Id)
					.Where(r => r.Status == ReceiptStatus.StateVerified)
					.Where(r => r.PublicationStatus == ReceiptPublicationStatus.Active)
					.Sum(r => (decimal?)r.TotalAmount) ?? 0m,
				c.Status,
				c.StartDate,
				c.Deadline,
				Categories = c.CategoryMappings
					.Where(m => m.Category.IsActive)
					.OrderBy(m => m.Category.SortOrder)
					.ThenBy(m => m.Category.NameUk)
					.Select(m => new PublicCampaignCategoryDto(
						m.Category.Id,
						m.Category.NameUk,
						m.Category.NameEn,
						m.Category.Slug))
					.ToList(),
				ReceiptCount = _db.Receipts.Count(r => r.CampaignId == c.Id
					&& r.Status == ReceiptStatus.StateVerified
					&& r.PublicationStatus == ReceiptPublicationStatus.Active)
			})
			.ToListAsync(cancellationToken);

		var campaigns = campaignRows.Select(c =>
			{
				var documentedAmount = CampaignDocumentationMetrics.BoundToCollectedAmount(
					CampaignDocumentationMetrics.ToMinorUnitsFromStoredAmount(c.DocumentedAmountRaw),
					c.CurrentAmount);
				var documentationPercent = CampaignDocumentationMetrics.CalculateDocumentedSharePercent(
					documentedAmount,
					c.CurrentAmount);

				return new PublicCampaignDto(
					c.Id,
					c.TitleUk,
					c.TitleEn,
					c.Description,
					_fileStorage.ResolvePublicUrl(c.CoverImageStorageKey),
					c.SendUrl,
					c.GoalAmount,
					c.CurrentAmount,
					documentedAmount,
					documentationPercent,
					c.Status,
					c.StartDate,
					c.Deadline,
					c.Categories,
					c.ReceiptCount,
					org.Name,
					org.Slug,
					org.IsVerified);
			})
			.ToList();

		return ServiceResponse<PublicListResponse<PublicCampaignDto>>.Success(
			new PublicListResponse<PublicCampaignDto>(campaigns, page, pageSize, totalCount));
	}
}
