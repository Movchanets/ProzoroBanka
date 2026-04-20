using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Common;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.DeleteDocument;

public class DeleteDocumentHandler : IRequestHandler<DeleteDocumentCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public DeleteDocumentHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse> Handle(DeleteDocumentCommand request, CancellationToken ct)
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

		var document = await _db.CampaignDocuments
			.Include(d => d.Purchase)
			.FirstOrDefaultAsync(
				d => d.Id == request.DocumentId
				     && d.PurchaseId == request.PurchaseId
				     && d.Purchase.OrganizationId == request.OrganizationId
				     && (request.CampaignId == null || d.Purchase.CampaignId == request.CampaignId),
				ct);

		if (document is null)
			return ServiceResponse.Failure("Документ не знайдено");

		document.IsDeleted = true;

		if (!string.IsNullOrEmpty(document.StorageKey))
			await _fileStorage.DeleteAsync(document.StorageKey, ct);

		await _db.SaveChangesAsync(ct);
		await PurchaseTotalAmountCalculator.RecalculateAndApplyAsync(_db, request.PurchaseId, ct);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse.Success("Документ видалено");
	}
}
