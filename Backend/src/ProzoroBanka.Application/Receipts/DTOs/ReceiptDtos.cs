using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.DTOs;

public record ReceiptPipelineDto(
	Guid Id,
	string OriginalFileName,
	string? ReceiptImageUrl,
	string? Alias,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? PurchaseDateUtc,
	ReceiptStatus Status,
	ReceiptPublicationStatus PublicationStatus,
	string? VerificationFailureReason,
	DateTime CreatedAt,
	Guid? CampaignId = null,
	string? CampaignTitle = null,
	string? FiscalNumber = null,
	string? ReceiptCode = null,
	string? Currency = null,
	string? PurchasedItemName = null,
	IReadOnlyList<ReceiptItemPhotoDto>? ItemPhotos = null,
	string? OcrStructuredPayloadJson = null,
	string? RawOcrJson = null,
	string? VerificationUrl = null,
	bool IsConfirmed = false);

public record ReceiptItemPhotoDto(
	Guid Id,
	string OriginalFileName,
	string PhotoUrl,
	int SortOrder);

public record ReceiptListItemDto(
	Guid Id,
	string OriginalFileName,
	string? Alias,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? PurchaseDateUtc,
	ReceiptStatus Status,
	ReceiptPublicationStatus PublicationStatus,
	Guid? CampaignId,
	string? CampaignTitle,
	DateTime CreatedAt);

public record VerifyReceiptRequest(Guid OrganizationId);

public record UpdateReceiptOcrDraftRequest(
	string? Alias,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? PurchaseDateUtc,
	string? FiscalNumber,
	string? ReceiptCode,
	string? Currency,
	string? PurchasedItemName,
	string? OcrStructuredPayloadJson);

public record ReorderReceiptItemPhotosRequest(IReadOnlyList<Guid> PhotoIds);
