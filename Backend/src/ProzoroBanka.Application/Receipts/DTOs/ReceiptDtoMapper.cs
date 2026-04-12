using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Receipts.DTOs;

public static class ReceiptDtoMapper
{
	public static ReceiptPipelineDto ToPipelineDto(IFileStorage fileStorage, Receipt receipt) =>
		new(
			receipt.Id,
			receipt.OriginalFileName,
			fileStorage.ResolvePublicUrl(receipt.ReceiptImageStorageKey ?? receipt.StorageKey),
			receipt.Alias,
			receipt.MerchantName,
			receipt.TotalAmount,
			receipt.PurchaseDateUtc,
			receipt.Status,
			receipt.PublicationStatus,
			receipt.VerificationFailureReason,
			receipt.CreatedAt,
			receipt.CampaignId,
			receipt.Campaign?.Title,
			receipt.FiscalNumber,
			receipt.ReceiptCode,
			receipt.Currency,
			receipt.PurchasedItemName,
			receipt.Items
				.Where(item => !item.IsDeleted)
				.OrderBy(item => item.SortOrder)
				.Select(item => new ReceiptItemDto(
					item.Id,
					item.Name,
					item.Quantity,
					item.UnitPrice,
					item.TotalPrice,
					item.Barcode,
					item.VatRate,
					item.VatAmount,
					item.SortOrder))
				.ToList(),
			receipt.ItemPhotos
				.Where(photo => !photo.IsDeleted)
				.OrderBy(photo => photo.SortOrder)
				.Select(photo => new ReceiptItemPhotoDto(
					photo.Id,
					photo.OriginalFileName,
					fileStorage.ResolvePublicUrl(photo.StorageKey) ?? string.Empty,
					photo.SortOrder,
					photo.ReceiptItemId))
				.ToList(),
			receipt.OcrStructuredPayloadJson,
			receipt.RawOcrJson,
			ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var verificationUrl, out _) ? verificationUrl : receipt.StateVerificationReference,
			receipt.Status == Domain.Enums.ReceiptStatus.StateVerified
				&& (ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var generatedVerificationUrl, out _)
					? !string.IsNullOrWhiteSpace(generatedVerificationUrl)
					: !string.IsNullOrWhiteSpace(receipt.StateVerificationReference)));
}
