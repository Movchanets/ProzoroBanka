using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.DTOs;

public record PurchaseListItemDto(
	Guid Id,
	string Title,
	long TotalAmount,
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
	long TotalAmount,
	PurchaseStatus Status,
	IReadOnlyList<DocumentDto> Documents,
	DateTime CreatedAt);

public record DocumentItemDto(
	Guid Id,
	string Name,
	decimal Quantity,
	long UnitPrice,
	long TotalPrice);

public record DocumentDto(
	Guid Id,
	Guid PurchaseId,
	Guid UploadedByUserId,
	DocumentType Type,
	string OriginalFileName,
	string? FileUrl,
	DateTime? DocumentDate,
	long? Amount,
	string? CounterpartyName,
	OcrProcessingStatus OcrProcessingStatus,
	bool IsDataVerifiedByUser,
	IReadOnlyList<DocumentItemDto>? Items,
	DateTime CreatedAt);

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
	long UnitPrice);

public record CreatePurchaseRequest(
	string Title,
	long TotalAmount);

public record UpdatePurchaseRequest(
	string? Title,
	long? TotalAmount,
	PurchaseStatus? Status);

public record UpdateDocumentMetadataRequest(
	long? Amount,
	string? CounterpartyName,
	DateTime? DocumentDate);
