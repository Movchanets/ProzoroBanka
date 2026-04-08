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
			StorageUrlResolver.Resolve(fileStorage, receipt.ReceiptImageStorageKey ?? receipt.StorageKey),
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
			receipt.ItemPhotos
				.Where(photo => !photo.IsDeleted)
				.OrderBy(photo => photo.SortOrder)
				.Select(photo => new ReceiptItemPhotoDto(
					photo.Id,
					photo.OriginalFileName,
					StorageUrlResolver.Resolve(fileStorage, photo.StorageKey) ?? string.Empty,
					photo.SortOrder))
				.ToList(),
			receipt.OcrStructuredPayloadJson,
			receipt.RawOcrJson,
			ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var verificationUrl, out _) ? verificationUrl : receipt.StateVerificationReference,
			receipt.Status == Domain.Enums.ReceiptStatus.StateVerified
				&& (ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var generatedVerificationUrl, out _)
					? !string.IsNullOrWhiteSpace(generatedVerificationUrl)
					: !string.IsNullOrWhiteSpace(receipt.StateVerificationReference)));
}
