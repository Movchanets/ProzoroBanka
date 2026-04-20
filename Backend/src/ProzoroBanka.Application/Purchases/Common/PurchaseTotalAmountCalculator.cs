using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Common;

public static class PurchaseTotalAmountCalculator
{
	public static async Task RecalculateAndApplyAsync(
		IApplicationDbContext db,
		Guid purchaseId,
		CancellationToken ct)
	{
		var purchase = await db.CampaignPurchases
			.FirstOrDefaultAsync(p => p.Id == purchaseId, ct);

		if (purchase is null)
			return;

		purchase.TotalAmount = await CalculateAsync(db, purchaseId, ct);
	}

	private static async Task<long> CalculateAsync(IApplicationDbContext db, Guid purchaseId, CancellationToken ct)
	{
		var waybillLikeDocumentIds = await db.CampaignDocuments
			.Where(d => d.PurchaseId == purchaseId
				&& !d.IsDeleted
				&& (d.Type == DocumentType.Waybill || d.Type == DocumentType.Invoice))
			.Select(d => d.Id)
			.ToListAsync(ct);

		if (waybillLikeDocumentIds.Count > 0)
		{
			return await SumWaybillLikeItemTotalsAsync(db, waybillLikeDocumentIds, ct);
		}

		return await SumBankReceiptTotalsAsync(db, purchaseId, ct);
	}

	private static async Task<long> SumWaybillLikeItemTotalsAsync(
		IApplicationDbContext db,
		IReadOnlyCollection<Guid> waybillLikeDocumentIds,
		CancellationToken ct)
	{
		var total = await db.CampaignItems
			.Where(item => !item.IsDeleted &&
				(
					(item.CampaignDocumentId.HasValue && waybillLikeDocumentIds.Contains(item.CampaignDocumentId.Value))
					|| (EF.Property<Guid?>(item, "WaybillDocumentId").HasValue
						&& waybillLikeDocumentIds.Contains(EF.Property<Guid?>(item, "WaybillDocumentId")!.Value))
					|| (EF.Property<Guid?>(item, "InvoiceDocumentId").HasValue
						&& waybillLikeDocumentIds.Contains(EF.Property<Guid?>(item, "InvoiceDocumentId")!.Value))
				))
			.SumAsync(item => (long?)item.TotalPrice, ct);

		return total ?? 0;
	}

	private static async Task<long> SumBankReceiptTotalsAsync(IApplicationDbContext db, Guid purchaseId, CancellationToken ct)
	{
		var total = await db.CampaignDocuments
			.Where(d => d.PurchaseId == purchaseId
				&& !d.IsDeleted
				&& d.Type == DocumentType.BankReceipt
				&& d.Amount.HasValue)
			.SumAsync(d => (long?)d.Amount, ct);

		return total ?? 0;
	}
}