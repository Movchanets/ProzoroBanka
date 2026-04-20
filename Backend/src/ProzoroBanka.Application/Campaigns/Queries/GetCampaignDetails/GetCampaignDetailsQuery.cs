using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

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
				c.TitleUk,
				c.TitleEn,
				c.Description,
				c.CoverImageStorageKey,
				c.GoalAmount,
				c.CurrentAmount,
				WithdrawnAmount = _db.CampaignTransactions
					.Where(t => t.CampaignId == c.Id && t.Amount < 0)
					.Sum(t => (long?)(-t.Amount)) ?? 0,
				c.Status,
				c.StartDate,
				c.Deadline,
				c.MonobankAccountId,
				c.SendUrl,
				c.OrganizationId,
				OrganizationName = c.Organization.Name,
				Categories = c.CategoryMappings
					.Where(m => m.Category.IsActive)
					.OrderBy(m => m.Category.SortOrder)
					.ThenBy(m => m.Category.NameUk)
					.Select(m => new CampaignCategoryDto(
						m.Category.Id,
						m.Category.NameUk,
						m.Category.NameEn,
						m.Category.Slug,
						m.Category.SortOrder,
						m.Category.IsActive))
					.ToList(),
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

		var documentedAmountRaw = await _db.Receipts
			.AsNoTracking()
			.Where(r => r.CampaignId == campaign.Id)
			.WhereActiveVerifiedForDocumentation()
			.SumAsync(r => r.TotalAmount ?? 0, cancellationToken);
		var documentedExpenses = await _db.CampaignPurchases
			.AsNoTracking()
			.Where(p => p.CampaignId == campaign.Id && p.Status != PurchaseStatus.Cancelled)
			.Where(p => p.Documents.Any(d => !d.IsDeleted && d.Type != DocumentType.TransferAct))
			.SumAsync(p => (long?)p.TotalAmount, cancellationToken) ?? 0;
		var documentedAmount = CampaignDocumentationMetrics.BoundToCollectedAmount(
			CampaignDocumentationMetrics.ToMinorUnitsFromStoredAmount(documentedAmountRaw) + documentedExpenses,
			campaign.CurrentAmount);
		var receiptCount = await _db.Receipts
			.AsNoTracking()
			.CountAsync(r => r.CampaignId == campaign.Id, cancellationToken);
		var documentationPercent = CampaignDocumentationMetrics.CalculateDocumentedSharePercent(
			documentedAmount,
			campaign.CurrentAmount);

		return ServiceResponse<CampaignDetailDto>.Success(new CampaignDetailDto(
			campaign.Id, campaign.TitleUk, campaign.TitleEn, campaign.Description,
			_fileStorage.ResolvePublicUrl(campaign.CoverImageStorageKey),
			campaign.GoalAmount, campaign.CurrentAmount, campaign.WithdrawnAmount,
			documentedAmount, documentationPercent,
			campaign.Status, campaign.StartDate, campaign.Deadline,
			campaign.MonobankAccountId, campaign.SendUrl, campaign.Categories, receiptCount, campaign.OrganizationId,
			campaign.OrganizationName, campaign.CreatedByName,
			campaign.CreatedAt));
	}
}
