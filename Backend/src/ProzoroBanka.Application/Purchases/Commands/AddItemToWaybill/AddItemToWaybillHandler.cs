using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Common;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.AddItemToWaybill;

public class AddItemToWaybillHandler : IRequestHandler<AddItemToWaybillCommand, ServiceResponse<Guid>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public AddItemToWaybillHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<Guid>> Handle(AddItemToWaybillCommand request, CancellationToken ct)
	{
		var document = await _db.CampaignDocuments
			.OfType<WaybillDocument>()
			.Include(doc => doc.Purchase)
			.Include(doc => doc.Items)
			.FirstOrDefaultAsync(
				doc => doc.Id == request.WaybillDocumentId,
				ct);

		if (document is null)
			return ServiceResponse<Guid>.Failure("Видаткову накладну не знайдено");

		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			document.Purchase.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<Guid>.Failure(authResult.Message);

		if (document.Type != DocumentType.Waybill)
			return ServiceResponse<Guid>.Failure("Позиції можна додавати лише до видаткової накладної");

		var nextSortOrder = document.Items
			.Where(item => !item.IsDeleted)
			.Select(item => (int?)item.SortOrder)
			.Max() is int maxSortOrder
			? maxSortOrder + 1
			: 0;

		var totalPrice = checked((long)decimal.Round(request.Quantity * request.UnitPrice, 0, MidpointRounding.AwayFromZero));
		var item = new CampaignItem
		{
			CampaignId = document.Purchase.CampaignId,
			CampaignDocumentId = document.Id,
			Name = request.Name.Trim(),
			Quantity = request.Quantity,
			UnitPrice = request.UnitPrice,
			TotalPrice = totalPrice,
			SortOrder = nextSortOrder
		};

		_db.CampaignItems.Add(item);
		if (_db is DbContext efContext)
		{
			efContext.Entry(item).Property("WaybillDocumentId").CurrentValue = document.Id;
		}
		await _db.SaveChangesAsync(ct);
		await PurchaseTotalAmountCalculator.RecalculateAndApplyAsync(_db, document.PurchaseId, ct);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<Guid>.Success(item.Id);
	}
}