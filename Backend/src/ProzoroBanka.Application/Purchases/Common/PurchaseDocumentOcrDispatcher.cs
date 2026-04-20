using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Common;

public class PurchaseDocumentOcrDispatcher : IPurchaseDocumentOcrDispatcher
{
	private readonly IApplicationDbContext _db;

	public PurchaseDocumentOcrDispatcher(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task ApplyAsync(CampaignDocument document, DocumentOcrResult ocrResult, CancellationToken ct)
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
				await ApplyWaybillLikeOcr(waybill, ocrResult, ct);
				break;
			case InvoiceDocument invoice:
				await ApplyWaybillLikeOcr(invoice, ocrResult, ct);
				break;
			case TransferActDocument:
				throw new InvalidOperationException("OCR is forbidden for transfer acts");
		}
	}

	private static void ApplyBankReceiptOcr(BankReceiptDocument bankReceipt, DocumentOcrResult ocrResult)
	{
		bankReceipt.Edrpou = Normalize(ocrResult.Edrpou);
		bankReceipt.PayerFullName = Normalize(ocrResult.PayerFullName);
		bankReceipt.ReceiptCode = Normalize(ocrResult.ReceiptCode);
		bankReceipt.PaymentPurpose = Normalize(ocrResult.PaymentPurpose);
		bankReceipt.SenderIban = Normalize(ocrResult.SenderIban);
		bankReceipt.ReceiverIban = Normalize(ocrResult.ReceiverIban);
	}

	private static string? Normalize(string? value) =>
		string.IsNullOrWhiteSpace(value) ? null : value.Trim();

	private async Task ApplyWaybillLikeOcr(CampaignDocument document, DocumentOcrResult ocrResult, CancellationToken ct)
	{
		var documentItems = document switch
		{
			WaybillDocument waybill => waybill.Items,
			InvoiceDocument invoice => invoice.Items,
			_ => throw new InvalidOperationException("OCR item mapping is only supported for waybill-like documents")
		};

		await _db.CampaignItems
			.Where(item =>
				item.CampaignDocumentId == document.Id
				|| EF.Property<Guid?>(item, "WaybillDocumentId") == document.Id
				|| EF.Property<Guid?>(item, "InvoiceDocumentId") == document.Id)
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
			if (_db is DbContext efContext)
			{
				if (document is WaybillDocument)
					efContext.Entry(item).Property("WaybillDocumentId").CurrentValue = document.Id;
				else if (document is InvoiceDocument)
					efContext.Entry(item).Property("InvoiceDocumentId").CurrentValue = document.Id;
			}

			if (!documentItems.Contains(item))
				documentItems.Add(item);
		}
	}

	private static long ToKopecks(decimal value) =>
		(long)Math.Round(value * 100m, 0, MidpointRounding.AwayFromZero);
}