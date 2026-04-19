using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.UpdatePurchase;

public class UpdatePurchaseHandler : IRequestHandler<UpdatePurchaseCommand, ServiceResponse<PurchaseDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public UpdatePurchaseHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<PurchaseDetailDto>> Handle(UpdatePurchaseCommand request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<PurchaseDetailDto>.Failure(authResult.Message);

		var campaignExists = await _db.Campaigns.AnyAsync(
			c => c.Id == request.CampaignId && c.OrganizationId == request.OrganizationId,
			ct);

		if (!campaignExists)
			return ServiceResponse<PurchaseDetailDto>.Failure("Збір не знайдено в цій організації");

		var purchase = await _db.CampaignPurchases
			.Include(p => p.Documents)
			.FirstOrDefaultAsync(
				p => p.Id == request.PurchaseId
				     && p.CampaignId == request.CampaignId,
				ct);

		if (purchase is null)
			return ServiceResponse<PurchaseDetailDto>.Failure("Закупівлю не знайдено");

		if (request.Title is not null)
			purchase.Title = request.Title;

		if (request.TotalAmount.HasValue)
			purchase.TotalAmount = request.TotalAmount.Value;

		if (request.Status.HasValue)
			purchase.Status = request.Status.Value;

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<PurchaseDetailDto>.Success(PurchaseDtoMapper.ToDetailDto(_fileStorage, purchase));
	}
}
