using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Queries.GetCampaignDetails;

public record GetCampaignDetailsQuery(
	Guid CallerDomainUserId,
	Guid CampaignId) : IRequest<ServiceResponse<CampaignDetailDto>>;

public class GetCampaignDetailsHandler
	: IRequestHandler<GetCampaignDetailsQuery, ServiceResponse<CampaignDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public GetCampaignDetailsHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignDetailDto>> Handle(
		GetCampaignDetailsQuery request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.Where(c => c.Id == request.CampaignId)
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
				c.OrganizationId,
				OrganizationName = c.Organization.Name,
				CreatedByName = c.CreatedBy.FirstName + " " + c.CreatedBy.LastName,
				c.CreatedAt
			})
			.FirstOrDefaultAsync(cancellationToken);

		if (campaign is null)
			return ServiceResponse<CampaignDetailDto>.Failure("Збір не знайдено");

		var isMember = await _orgAuth.IsMember(
			campaign.OrganizationId, request.CallerDomainUserId, cancellationToken);

		if (!isMember)
			return ServiceResponse<CampaignDetailDto>.Failure("Немає доступу до організації");

		var memberIds = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == campaign.OrganizationId && !m.IsDeleted)
			.Select(m => m.UserId)
			.ToListAsync(cancellationToken);

		var orgDocumentedAmount = await _db.Receipts
			.AsNoTracking()
			.Where(r => memberIds.Contains(r.UserId) && r.Status == Domain.Enums.ReceiptStatus.StateVerified)
			.SumAsync(r => r.TotalAmount ?? 0, cancellationToken);

		var documentedAmount = Math.Min(campaign.CurrentAmount, orgDocumentedAmount);
		var documentationPercent = campaign.GoalAmount <= 0
			? 0
			: Math.Min(100, (double)(documentedAmount / campaign.GoalAmount * 100));

		return ServiceResponse<CampaignDetailDto>.Success(new CampaignDetailDto(
			campaign.Id, campaign.Title, campaign.Description,
			StorageUrlResolver.Resolve(_fileStorage, campaign.CoverImageStorageKey),
			campaign.GoalAmount, campaign.CurrentAmount, campaign.WithdrawnAmount,
			documentedAmount, documentationPercent,
			campaign.Status, campaign.StartDate, campaign.Deadline,
			campaign.MonobankAccountId, campaign.SendUrl, campaign.OrganizationId,
			campaign.OrganizationName, campaign.CreatedByName,
			campaign.CreatedAt));
	}
}
