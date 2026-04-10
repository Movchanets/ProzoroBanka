using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Campaigns.Queries.GetCampaignReceipts;

public record GetCampaignReceiptsQuery(
	Guid CallerDomainUserId,
	Guid CampaignId) : IRequest<ServiceResponse<IReadOnlyList<ReceiptListItemDto>>>;

public class GetCampaignReceiptsHandler
	: IRequestHandler<GetCampaignReceiptsQuery, ServiceResponse<IReadOnlyList<ReceiptListItemDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetCampaignReceiptsHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<IReadOnlyList<ReceiptListItemDto>>> Handle(GetCampaignReceiptsQuery request, CancellationToken ct)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.Select(c => new { c.Id, c.OrganizationId, c.Title })
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, ct);

		if (campaign is null)
			return ServiceResponse<IReadOnlyList<ReceiptListItemDto>>.Failure("Збір не знайдено");

		var isMember = await _orgAuth.IsMember(campaign.OrganizationId, request.CallerDomainUserId, ct);
		if (!isMember)
			return ServiceResponse<IReadOnlyList<ReceiptListItemDto>>.Failure("Немає доступу до організації");

		var receipts = await _db.Receipts
			.AsNoTracking()
			.Where(r => r.CampaignId == request.CampaignId)
			.OrderByDescending(r => r.PurchaseDateUtc ?? r.CreatedAt)
			.Select(r => new ReceiptListItemDto(
				r.Id,
				r.OriginalFileName,
				r.Alias,
				r.MerchantName,
				($"{r.User.FirstName} {r.User.LastName}").Trim(),
				r.User.Email,
				r.TotalAmount,
				r.PurchaseDateUtc,
				r.Status,
				r.PublicationStatus,
				r.CampaignId,
				campaign.Title,
				r.CreatedAt))
			.ToListAsync(ct);

		return ServiceResponse<IReadOnlyList<ReceiptListItemDto>>.Success(receipts);
	}
}
