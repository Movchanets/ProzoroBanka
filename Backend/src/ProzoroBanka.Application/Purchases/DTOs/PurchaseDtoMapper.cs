using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.DTOs;

public static class PurchaseDtoMapper
{
	public static PurchaseListItemDto ToListItemDto(CampaignPurchase purchase) =>
		new(
			purchase.Id,
			purchase.Title,
			purchase.TotalAmount,
			purchase.Status,
			purchase.Documents.Count(d => !d.IsDeleted),
			purchase.Documents.Count(d => !d.IsDeleted && d.IsDataVerifiedByUser),
			purchase.CreatedAt);

	public static PurchaseDetailDto ToDetailDto(IFileStorage fileStorage, CampaignPurchase purchase) =>
		new(
			purchase.Id,
			purchase.CampaignId,
			purchase.CreatedByUserId,
			purchase.Title,
			purchase.Description,
			purchase.TotalAmount,
			purchase.Status,
			purchase.Documents
				.Where(d => !d.IsDeleted)
				.OrderBy(d => d.CreatedAt)
				.Select(d => ToDocumentDto(fileStorage, d))
				.ToList(),
			purchase.CreatedAt);

	public static DocumentDto ToDocumentDto(IFileStorage fileStorage, CampaignDocument document) =>
		new(
			document.Id,
			document.PurchaseId,
			document.UploadedByUserId,
			document.Type,
			document.OriginalFileName,
			fileStorage.ResolvePublicUrl(document.StorageKey),
			document.DocumentDate,
			document.Amount,
			document.CounterpartyName,
			document.OcrProcessingStatus,
			document.IsDataVerifiedByUser,
			ToDocumentItems(document),
			document.CreatedAt,
			GetBankReceiptSenderIbanOrCard(document),
			GetBankReceiptEdrpou(document),
			GetBankReceiptPayerFullName(document),
			GetBankReceiptTotalItemsAmount(document),
			GetBankReceiptReceiptCode(document),
			GetBankReceiptPaymentPurpose(document),
			GetBankReceiptSenderIban(document),
			GetBankReceiptReceiverIban(document));

	/// <summary>
	/// Публічний DTO — без FileUrl для TransferAct (безпекове обмеження).
	/// </summary>
	public static DocumentDto ToPublicDocumentDto(IFileStorage fileStorage, CampaignDocument document) =>
		new(
			document.Id,
			document.PurchaseId,
			document.UploadedByUserId,
			document.Type,
			document.OriginalFileName,
			document.Type == DocumentType.TransferAct ? null : fileStorage.ResolvePublicUrl(document.StorageKey),
			document.DocumentDate,
			document.Amount,
			document.CounterpartyName,
			document.OcrProcessingStatus,
			document.IsDataVerifiedByUser,
			ToDocumentItems(document),
			document.CreatedAt,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null);

	private static IReadOnlyList<DocumentItemDto>? ToDocumentItems(CampaignDocument document)
	{
		var documentItems = document switch
		{
			WaybillDocument waybill => waybill.Items,
			InvoiceDocument invoice => invoice.Items,
			_ => null
		};

		return documentItems is null
			? null
			: documentItems
				.Where(item => !item.IsDeleted)
				.OrderBy(item => item.CreatedAt)
				.Select(item => new DocumentItemDto(
					item.Id,
					item.Name,
					item.Quantity,
					item.UnitPrice,
					item.TotalPrice))
				.ToList();
	}

	private static string? GetBankReceiptSenderIbanOrCard(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.SenderIbanOrCard : null;

	private static string? GetBankReceiptEdrpou(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.Edrpou : null;

	private static string? GetBankReceiptPayerFullName(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.PayerFullName : null;

	private static long? GetBankReceiptTotalItemsAmount(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.TotalItemsAmount : null;

	private static string? GetBankReceiptReceiptCode(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.ReceiptCode : null;

	private static string? GetBankReceiptPaymentPurpose(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.PaymentPurpose : null;

	private static string? GetBankReceiptSenderIban(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.SenderIban : null;

	private static string? GetBankReceiptReceiverIban(CampaignDocument document) =>
		document is BankReceiptDocument bankReceipt ? bankReceipt.ReceiverIban : null;
}
