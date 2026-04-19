using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.CreatePurchase;

public class CreatePurchaseHandler : IRequestHandler<CreatePurchaseCommand, ServiceResponse<PurchaseDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public CreatePurchaseHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<PurchaseDetailDto>> Handle(CreatePurchaseCommand request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<PurchaseDetailDto>.Failure(authResult.Message);

		var campaignExists = await _db.Campaigns.AnyAsync(
			c => c.Id == request.CampaignId && c.OrganizationId == request.OrganizationId, ct);

		if (!campaignExists)
			return ServiceResponse<PurchaseDetailDto>.Failure("Збір не знайдено в цій організації");

		var purchase = new CampaignPurchase
		{
			OrganizationId = request.OrganizationId,
			CampaignId = request.CampaignId,
			CreatedByUserId = request.CallerDomainUserId,
			Title = request.Title,
			TotalAmount = request.TotalAmount,
			Status = PurchaseStatus.PaymentSent
		};

		_db.CampaignPurchases.Add(purchase);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<PurchaseDetailDto>.Success(PurchaseDtoMapper.ToDetailDto(_fileStorage, purchase));
	}
}
