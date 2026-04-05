using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.DTOs;

public record ReceiptPipelineDto(
	Guid Id,
	string OriginalFileName,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? PurchaseDateUtc,
	ReceiptStatus Status,
	ReceiptPublicationStatus PublicationStatus,
	string? VerificationFailureReason,
	DateTime CreatedAt,
	string? FiscalNumber = null,
	string? ReceiptCode = null,
	string? Currency = null,
	string? PurchasedItemName = null,
	string? OcrStructuredPayloadJson = null,
	string? RawOcrJson = null);

public record VerifyReceiptRequest(Guid OrganizationId);

public record UpdateReceiptOcrDraftRequest(
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? PurchaseDateUtc,
	string? FiscalNumber,
	string? ReceiptCode,
	string? Currency,
	string? PurchasedItemName,
	string? OcrStructuredPayloadJson);
