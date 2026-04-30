using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.AttachPurchaseToCampaign;

public class AttachPurchaseToCampaignHandler : IRequestHandler<AttachPurchaseToCampaignCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public AttachPurchaseToCampaignHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse> Handle(AttachPurchaseToCampaignCommand request, CancellationToken ct)
	{
		var purchase = await _db.CampaignPurchases.FirstOrDefaultAsync(
			candidate => candidate.Id == request.PurchaseId,
			ct);

		if (purchase is null)
			return ServiceResponse.Failure("Закупівлю не знайдено");

		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			purchase.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse.Failure(authResult.Message);

		if (purchase.CampaignId.HasValue)
			return ServiceResponse.Failure("Закупівля вже прикріплена до збору");

		var campaign = await _db.Campaigns.FirstOrDefaultAsync(
			candidate => candidate.Id == request.CampaignId && candidate.OrganizationId == purchase.OrganizationId,
			ct);

		if (campaign is null)
			return ServiceResponse.Failure("Збір не знайдено в цій організації");

		purchase.CampaignId = campaign.Id;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse.Success("Закупівлю прикріплено до збору");
	}
}