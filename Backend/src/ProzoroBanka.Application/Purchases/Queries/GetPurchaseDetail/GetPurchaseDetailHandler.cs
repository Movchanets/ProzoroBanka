using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Queries.GetPurchaseDetail;

public class GetPurchaseDetailHandler
	: IRequestHandler<GetPurchaseDetailQuery, ServiceResponse<PurchaseDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetPurchaseDetailHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<PurchaseDetailDto>> Handle(
		GetPurchaseDetailQuery request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<PurchaseDetailDto>.Failure(authResult.Message);

		if (request.CampaignId.HasValue)
		{
			var campaignExists = await _db.Campaigns.AnyAsync(
				c => c.Id == request.CampaignId.Value && c.OrganizationId == request.OrganizationId,
				ct);

			if (!campaignExists)
				return ServiceResponse<PurchaseDetailDto>.Failure("Збір не знайдено в цій організації");
		}

		var purchase = await _db.CampaignPurchases
			.Include(p => p.Documents)
			.FirstOrDefaultAsync(
				p => p.Id == request.PurchaseId
					&& p.OrganizationId == request.OrganizationId
					&& (request.CampaignId == null || p.CampaignId == request.CampaignId),
				ct);

		if (purchase is null)
			return ServiceResponse<PurchaseDetailDto>.Failure("Закупівлю не знайдено");

		await LoadDocumentItemsAsync(purchase, ct);

		return ServiceResponse<PurchaseDetailDto>.Success(
			PurchaseDtoMapper.ToDetailDto(_fileStorage, purchase));
	}

	private async Task LoadDocumentItemsAsync(CampaignPurchase purchase, CancellationToken ct)
	{
		var documentIds = purchase.Documents
			.OfType<WaybillDocument>()
			.Select(document => document.Id)
			.Concat(purchase.Documents.OfType<InvoiceDocument>().Select(document => document.Id))
			.ToList();

		if (documentIds.Count == 0)
			return;

		await _db.CampaignItems
			.Where(item =>
				(item.CampaignDocumentId.HasValue && documentIds.Contains(item.CampaignDocumentId.Value))
				|| (EF.Property<Guid?>(item, "WaybillDocumentId").HasValue && documentIds.Contains(EF.Property<Guid?>(item, "WaybillDocumentId")!.Value))
				|| (EF.Property<Guid?>(item, "InvoiceDocumentId").HasValue && documentIds.Contains(EF.Property<Guid?>(item, "InvoiceDocumentId")!.Value)))
			.LoadAsync(ct);
	}
}
