using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.UploadDocument;

public class UploadDocumentHandler : IRequestHandler<UploadDocumentCommand, ServiceResponse<DocumentDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public UploadDocumentHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<DocumentDto>> Handle(UploadDocumentCommand request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<DocumentDto>.Failure(authResult.Message);

		var campaignExists = await _db.Campaigns.AnyAsync(
			c => c.Id == request.CampaignId && c.OrganizationId == request.OrganizationId,
			ct);

		if (!campaignExists)
			return ServiceResponse<DocumentDto>.Failure("Збір не знайдено в цій організації");

		var purchaseExists = await _db.CampaignPurchases.AnyAsync(
			p => p.Id == request.PurchaseId && p.CampaignId == request.CampaignId, ct);

		if (!purchaseExists)
			return ServiceResponse<DocumentDto>.Failure("Закупівлю не знайдено");

		request.FileStream.Position = 0;
		var storageKey = await _fileStorage.UploadAsync(
			request.FileStream, request.FileName, request.ContentType, ct);

		// Security: TransferAct → OCR is strictly forbidden
		var ocrStatus = request.Type == DocumentType.TransferAct
			? OcrProcessingStatus.NotRequired
			: OcrProcessingStatus.NotProcessed;

		CampaignDocument document = request.Type switch
		{
			DocumentType.BankReceipt => new BankReceiptDocument(),
			DocumentType.Waybill => new WaybillDocument(),
			DocumentType.Invoice => new InvoiceDocument(),
			DocumentType.TransferAct => new TransferActDocument(),
			DocumentType.Other => new OtherDocument(),
			_ => new OtherDocument()
		};

		document.PurchaseId = request.PurchaseId;
		document.UploadedByUserId = request.CallerDomainUserId;
		document.Type = request.Type;
		document.StorageKey = storageKey;
		document.OriginalFileName = request.FileName;
		document.DocumentDate = request.DocumentDate;
		document.Amount = request.Amount;
		document.CounterpartyName = request.CounterpartyName;
		document.OcrProcessingStatus = ocrStatus;
		document.IsDataVerifiedByUser = false;

		_db.CampaignDocuments.Add(document);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<DocumentDto>.Success(PurchaseDtoMapper.ToDocumentDto(_fileStorage, document));
	}
}
