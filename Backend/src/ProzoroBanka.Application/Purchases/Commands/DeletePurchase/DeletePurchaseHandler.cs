using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.DeletePurchase;

public class DeletePurchaseHandler : IRequestHandler<DeletePurchaseCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public DeletePurchaseHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse> Handle(DeletePurchaseCommand request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse.Failure(authResult.Message);

		if (request.CampaignId.HasValue)
		{
			var campaignExists = await _db.Campaigns.AnyAsync(
				c => c.Id == request.CampaignId.Value && c.OrganizationId == request.OrganizationId,
				ct);

			if (!campaignExists)
				return ServiceResponse.Failure("Збір не знайдено в цій організації");
		}

		var purchase = await _db.CampaignPurchases
			.Include(p => p.Documents)
			.FirstOrDefaultAsync(
				p => p.Id == request.PurchaseId
				     && p.OrganizationId == request.OrganizationId
				     && (request.CampaignId == null || p.CampaignId == request.CampaignId),
				ct);

		if (purchase is null)
			return ServiceResponse.Failure("Закупівлю не знайдено");

		// Soft-delete all documents and clean up storage
		foreach (var doc in purchase.Documents.Where(d => !d.IsDeleted))
		{
			doc.IsDeleted = true;
			if (!string.IsNullOrEmpty(doc.StorageKey))
				await _fileStorage.DeleteAsync(doc.StorageKey, ct);
		}

		purchase.IsDeleted = true;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse.Success("Закупівлю видалено");
	}
}
