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
	DateTime CreatedAt);

public record VerifyReceiptRequest(Guid OrganizationId);
