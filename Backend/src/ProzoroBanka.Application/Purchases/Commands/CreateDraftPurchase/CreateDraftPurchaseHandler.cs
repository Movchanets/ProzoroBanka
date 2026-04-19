using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.CreateDraftPurchase;

public class CreateDraftPurchaseHandler : IRequestHandler<CreateDraftPurchaseCommand, ServiceResponse<Guid>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public CreateDraftPurchaseHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<Guid>> Handle(CreateDraftPurchaseCommand request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<Guid>.Failure(authResult.Message);

		var purchase = new CampaignPurchase
		{
			OrganizationId = request.OrganizationId,
			CreatedByUserId = request.CallerDomainUserId,
			Title = request.Title.Trim(),
			Description = request.Description?.Trim(),
			Status = PurchaseStatus.PaymentSent,
			CampaignId = null,
			TotalAmount = 0
		};

		_db.CampaignPurchases.Add(purchase);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<Guid>.Success(purchase.Id);
	}
}