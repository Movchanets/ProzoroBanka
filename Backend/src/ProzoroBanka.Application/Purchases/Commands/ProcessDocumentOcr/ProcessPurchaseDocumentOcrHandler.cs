using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.ProcessDocumentOcr;

public class ProcessPurchaseDocumentOcrHandler : IRequestHandler<ProcessPurchaseDocumentOcrCommand, ServiceResponse<DocumentDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IDocumentOcrService _ocrService;

	public ProcessPurchaseDocumentOcrHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth,
		IDocumentOcrService ocrService)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
		_ocrService = ocrService;
	}

	public async Task<ServiceResponse<DocumentDto>> Handle(ProcessPurchaseDocumentOcrCommand request, CancellationToken ct)
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

		if (document.Type == DocumentType.TransferAct)
			return ServiceResponse<DocumentDto>.Failure("OCR не підтримується для Актів прийому-передачі.");

		if (document.OcrProcessingStatus == OcrProcessingStatus.Success)
			return ServiceResponse<DocumentDto>.Failure("Документ вже розпізнано.");

		try
		{
			document.OcrProcessingStatus = OcrProcessingStatus.Processing;
			await _db.SaveChangesAsync(ct);

			using var fileStream = await _fileStorage.OpenReadAsync(document.StorageKey, ct);

			var ocrResult = await _ocrService.ParseDocumentAsync(fileStream, document.OriginalFileName, document.Type, ct: ct);

			if (ocrResult.Success)
			{
				document.OcrProcessingStatus = OcrProcessingStatus.Success;
				await ApplyOcrResult(document, ocrResult, ct);
			}
			else
			{
				document.OcrProcessingStatus = OcrProcessingStatus.Failed;
			}
		}
		catch (Exception)
		{
			document.OcrProcessingStatus = OcrProcessingStatus.Failed;
		}

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<DocumentDto>.Success(PurchaseDtoMapper.ToDocumentDto(_fileStorage, document));
	}

	private async Task ApplyOcrResult(CampaignDocument document, DocumentOcrResult ocrResult, CancellationToken ct)
	{
		document.IsDataVerifiedByUser = false;
		document.OcrRawResult = ocrResult.RawJson;
		document.CounterpartyName = string.IsNullOrWhiteSpace(ocrResult.CounterpartyName)
			? null
			: ocrResult.CounterpartyName.Trim();
		document.Amount = ocrResult.TotalAmount.HasValue
			? (long)Math.Round(ocrResult.TotalAmount.Value * 100m, 0, MidpointRounding.AwayFromZero)
			: null;
		document.DocumentDate = ocrResult.DocumentDate.HasValue
			? DateTime.SpecifyKind(ocrResult.DocumentDate.Value, DateTimeKind.Utc)
			: null;

		switch (document)
		{
			case BankReceiptDocument bankReceipt:
				ApplyBankReceiptOcr(bankReceipt, ocrResult);
				break;
			case WaybillDocument waybill:
				await ApplyWaybillOcr(waybill, ocrResult, ct);
				break;
			case InvoiceDocument invoice:
				await ApplyWaybillOcr(invoice, ocrResult, ct);
				break;
		}
	}

	private static void ApplyBankReceiptOcr(BankReceiptDocument bankReceipt, DocumentOcrResult ocrResult)
	{
		bankReceipt.TotalItemsAmount = ocrResult.Items.Sum(item => ToKopecks(item.TotalPrice));
	}

	private async Task ApplyWaybillOcr(CampaignDocument document, DocumentOcrResult ocrResult, CancellationToken ct)
	{
		var documentItems = document switch
		{
			WaybillDocument waybill => waybill.Items,
			InvoiceDocument invoice => invoice.Items,
			_ => throw new InvalidOperationException("OCR item mapping is only supported for waybill-like documents")
		};

		await _db.CampaignItems
			.Where(item => item.CampaignDocumentId == document.Id)
			.LoadAsync(ct);

		foreach (var existingItem in documentItems.Where(item => !item.IsDeleted))
		{
			existingItem.IsDeleted = true;
		}

		var nextSortOrder = 0;
		foreach (var parsedItem in ocrResult.Items)
		{
			var item = new CampaignItem
			{
				CampaignId = document.Purchase.CampaignId,
				CampaignDocumentId = document.Id,
				Name = parsedItem.Name,
				Quantity = parsedItem.Quantity,
				UnitPrice = ToKopecks(parsedItem.UnitPrice),
				TotalPrice = ToKopecks(parsedItem.TotalPrice),
				SortOrder = nextSortOrder++
			};

			_db.CampaignItems.Add(item);
		}
	}

	private static long ToKopecks(decimal value) =>
		(long)Math.Round(value * 100m, 0, MidpointRounding.AwayFromZero);
}
