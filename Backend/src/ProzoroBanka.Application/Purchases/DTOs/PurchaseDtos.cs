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
	Guid CampaignId,
	Guid CreatedByUserId,
	string Title,
	long TotalAmount,
	PurchaseStatus Status,
	IReadOnlyList<DocumentDto> Documents,
	DateTime CreatedAt);

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
	DateTime CreatedAt);

// ── Request DTOs ──

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
