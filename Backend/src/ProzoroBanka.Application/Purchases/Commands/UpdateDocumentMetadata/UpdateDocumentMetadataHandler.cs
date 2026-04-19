using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.UpdateDocumentMetadata;

public class UpdateDocumentMetadataHandler : IRequestHandler<UpdateDocumentMetadataCommand, ServiceResponse<DocumentDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public UpdateDocumentMetadataHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<DocumentDto>> Handle(UpdateDocumentMetadataCommand request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<DocumentDto>.Failure(authResult.Message);

		if (request.CampaignId.HasValue)
		{
			var campaignExists = await _db.Campaigns.AnyAsync(
				c => c.Id == request.CampaignId.Value && c.OrganizationId == request.OrganizationId,
				ct);

			if (!campaignExists)
				return ServiceResponse<DocumentDto>.Failure("Збір не знайдено в цій організації");
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
			return ServiceResponse<DocumentDto>.Failure("Документ не знайдено");

		if (request.Amount.HasValue)
			document.Amount = request.Amount.Value;

		if (request.CounterpartyName is not null)
			document.CounterpartyName = request.CounterpartyName;

		if (request.DocumentDate.HasValue)
			document.DocumentDate = request.DocumentDate.Value;

		if (document is BankReceiptDocument bankReceipt)
		{
			if (request.SenderIbanOrCard is not null)
				bankReceipt.SenderIbanOrCard = request.SenderIbanOrCard;

			if (request.Edrpou is not null)
				bankReceipt.Edrpou = request.Edrpou;

			if (request.PayerFullName is not null)
				bankReceipt.PayerFullName = request.PayerFullName;

			if (request.ReceiptCode is not null)
				bankReceipt.ReceiptCode = request.ReceiptCode;

			if (request.PaymentPurpose is not null)
				bankReceipt.PaymentPurpose = request.PaymentPurpose;

			if (request.SenderIban is not null)
				bankReceipt.SenderIban = request.SenderIban;

			if (request.ReceiverIban is not null)
				bankReceipt.ReceiverIban = request.ReceiverIban;
		}

		document.IsDataVerifiedByUser = true;

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<DocumentDto>.Success(PurchaseDtoMapper.ToDocumentDto(_fileStorage, document));
	}
}
