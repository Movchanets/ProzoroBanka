using MediatR;
using Microsoft.EntityFrameworkCore;
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

		var memberIds = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == org.Id && !m.IsDeleted)
			.Select(m => m.UserId)
			.ToListAsync(cancellationToken);

		var orgDocumentedAmount = await _db.Receipts
			.AsNoTracking()
			.Where(r => memberIds.Contains(r.UserId) && r.Status == ReceiptStatus.Verified)
			.SumAsync(r => r.TotalAmount ?? 0, cancellationToken);

		var totalCount = await query.CountAsync(cancellationToken);
		var campaigns = await query
			.OrderByDescending(c => c.Status == CampaignStatus.Active)
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
				Math.Min(c.CurrentAmount, orgDocumentedAmount),
				c.GoalAmount <= 0
					? 0
					: Math.Min(100, (double)(Math.Min(c.CurrentAmount, orgDocumentedAmount) / c.GoalAmount * 100)),
				c.Status,
				c.StartDate,
				c.Deadline,
				0,
				org.Name,
				org.Slug,
				org.IsVerified))
			.ToListAsync(cancellationToken);

		return ServiceResponse<PublicListResponse<PublicCampaignDto>>.Success(
			new PublicListResponse<PublicCampaignDto>(campaigns, page, pageSize, totalCount));
	}
}
