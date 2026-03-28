using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetPublicCampaign;

public record GetPublicCampaignQuery(Guid CampaignId) : IRequest<ServiceResponse<PublicCampaignDetailDto>>;

public class GetPublicCampaignHandler : IRequestHandler<GetPublicCampaignQuery, ServiceResponse<PublicCampaignDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicCampaignHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicCampaignDetailDto>> Handle(
		GetPublicCampaignQuery request,
		CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.Where(c => c.Id == request.CampaignId && c.Status != CampaignStatus.Draft)
			.Select(c => new
			{
				c.Id,
				c.Title,
				c.Description,
				c.CoverImageStorageKey,
				c.SendUrl,
				c.GoalAmount,
				c.CurrentAmount,
				c.Status,
				c.StartDate,
				c.Deadline,
				c.OrganizationId,
				OrganizationName = c.Organization.Name,
				OrganizationSlug = c.Organization.Slug
			})
			.FirstOrDefaultAsync(cancellationToken);

		if (campaign is null)
			return ServiceResponse<PublicCampaignDetailDto>.Failure("Збір не знайдено");

		var memberIds = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == campaign.OrganizationId)
			.Select(m => m.UserId)
			.ToListAsync(cancellationToken);

		var latestReceipts = await _db.Receipts
			.AsNoTracking()
			.Where(r => memberIds.Contains(r.UserId) && r.Status == ReceiptStatus.Verified)
			.OrderByDescending(r => r.TransactionDate ?? r.CreatedAt)
			.Take(3)
			.Select(r => new PublicReceiptDto(
				r.Id,
				r.MerchantName,
				r.TotalAmount,
				r.TransactionDate,
				r.User.FirstName + " " + r.User.LastName))
			.ToListAsync(cancellationToken);

		var progress = campaign.GoalAmount <= 0
			? 0
			: Math.Min(100, (double)(campaign.CurrentAmount / campaign.GoalAmount * 100));

		int? daysRemaining = null;
		if (campaign.Deadline.HasValue)
			daysRemaining = Math.Max(0, (campaign.Deadline.Value.Date - DateTime.UtcNow.Date).Days);

		return ServiceResponse<PublicCampaignDetailDto>.Success(new PublicCampaignDetailDto(
			campaign.Id,
			campaign.Title,
			campaign.Description,
			StorageUrlResolver.Resolve(_fileStorage, campaign.CoverImageStorageKey),
			campaign.SendUrl,
			campaign.GoalAmount,
			campaign.CurrentAmount,
			campaign.Status,
			campaign.StartDate,
			campaign.Deadline,
			progress,
			daysRemaining,
			campaign.OrganizationId,
			campaign.OrganizationName,
			campaign.OrganizationSlug,
			latestReceipts));
	}
}
