using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.DetachReceiptFromCampaign;

public class DetachReceiptFromCampaignHandler : IRequestHandler<DetachReceiptFromCampaignCommand, ServiceResponse<Unit>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public DetachReceiptFromCampaignHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<Unit>> Handle(DetachReceiptFromCampaignCommand request, CancellationToken ct)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, ct);

		if (campaign is null)
			return ServiceResponse<Unit>.Failure("Збір не знайдено");

		var isMember = await _orgAuth.IsMember(campaign.OrganizationId, request.CallerDomainUserId, ct);
		if (!isMember)
			return ServiceResponse<Unit>.Failure("Немає доступу до організації");

		var receipt = await _db.Receipts
			.FirstOrDefaultAsync(r => r.Id == request.ReceiptId, ct);

		if (receipt is null)
			return ServiceResponse<Unit>.Failure("Чек не знайдено");

		if (receipt.CampaignId != request.CampaignId)
			return ServiceResponse<Unit>.Failure("Чек не прикріплено до цього збору");

		receipt.CampaignId = null;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<Unit>.Success(Unit.Value);
	}
}
