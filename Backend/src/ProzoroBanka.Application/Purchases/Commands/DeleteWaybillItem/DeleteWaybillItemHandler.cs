using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Common;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.DeleteWaybillItem;

public class DeleteWaybillItemHandler : IRequestHandler<DeleteWaybillItemCommand, ServiceResponse<DocumentDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public DeleteWaybillItemHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<DocumentDto>> Handle(DeleteWaybillItemCommand request, CancellationToken ct)
	{
		var document = await _db.CampaignDocuments
			.OfType<WaybillDocument>()
			.Include(doc => doc.Purchase)
			.Include(doc => doc.Items)
			.FirstOrDefaultAsync(doc => doc.Id == request.WaybillDocumentId, ct);

		if (document is null)
			return ServiceResponse<DocumentDto>.Failure("Видаткову накладну не знайдено");

		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			document.Purchase.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<DocumentDto>.Failure(authResult.Message);

		var item = document.Items.FirstOrDefault(candidate => candidate.Id == request.WaybillItemId && !candidate.IsDeleted);
		if (item is null)
			return ServiceResponse<DocumentDto>.Failure("Позицію товару не знайдено");

		item.IsDeleted = true;

		await _db.SaveChangesAsync(ct);
		await PurchaseTotalAmountCalculator.RecalculateAndApplyAsync(_db, document.PurchaseId, ct);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<DocumentDto>.Success(PurchaseDtoMapper.ToDocumentDto(_fileStorage, document));
	}
}