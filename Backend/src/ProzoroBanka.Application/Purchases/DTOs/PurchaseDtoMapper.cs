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
			purchase.CampaignId ?? Guid.Empty,
			purchase.CreatedByUserId,
			purchase.Title,
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
			document.CreatedAt);

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
			document.CreatedAt);
}
