using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.DTOs;

public record PurchaseListItemDto(
	Guid Id,
	string Title,
	decimal TotalAmount,
	PurchaseStatus Status,
	int DocumentCount,
	int VerifiedDocumentCount,
	DateTime CreatedAt);

public record PurchaseDetailDto(
	Guid Id,
	Guid? CampaignId,
	Guid CreatedByUserId,
	string Title,
	string? Description,
	decimal TotalAmount,
	PurchaseStatus Status,
	IReadOnlyList<DocumentDto> Documents,
	DateTime CreatedAt);

public record DocumentItemDto(
	Guid Id,
	string Name,
	decimal Quantity,
	decimal UnitPrice,
	decimal TotalPrice);

public record DocumentDto(
	Guid Id,
	Guid PurchaseId,
	Guid UploadedByUserId,
	DocumentType Type,
	string OriginalFileName,
	string? FileUrl,
	DateTime? DocumentDate,
	decimal? Amount,
	string? CounterpartyName,
	OcrProcessingStatus OcrProcessingStatus,
	bool IsDataVerifiedByUser,
	IReadOnlyList<DocumentItemDto>? Items,
	DateTime CreatedAt,
	string? Edrpou = null,
	string? PayerFullName = null,
	string? ReceiptCode = null,
	string? PaymentPurpose = null,
	string? SenderIban = null,
	string? ReceiverIban = null);

// ── Request DTOs ──

public record CreateDraftPurchaseRequest(
	Guid OrganizationId,
	string Title,
	string? Description);

public record AttachPurchaseToCampaignRequest(
	Guid CampaignId);

public record AddItemToWaybillRequest(
	string Name,
	decimal Quantity,
	decimal UnitPrice);

public record UpdateWaybillItemRequest(
	string Name,
	decimal Quantity,
	decimal UnitPrice);

public record CreatePurchaseRequest(
	string Title,
	decimal TotalAmount);

public record UpdatePurchaseRequest(
	string? Title,
	decimal? TotalAmount,
	PurchaseStatus? Status);

public record UpdateDocumentMetadataRequest(
	decimal? Amount,
	string? CounterpartyName,
	DateTime? DocumentDate,
	string? Edrpou = null,
	string? PayerFullName = null,
	string? ReceiptCode = null,
	string? PaymentPurpose = null,
	string? SenderIban = null,
	string? ReceiverIban = null);

public record ProcessDocumentOcrRequest(
	bool ConfirmReprocess = false);
