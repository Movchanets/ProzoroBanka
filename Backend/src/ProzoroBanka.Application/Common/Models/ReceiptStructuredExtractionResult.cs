namespace ProzoroBanka.Application.Common.Models;

public record ReceiptStructuredExtractionResult(
	bool Success,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? PurchaseDateUtc,
	string? FiscalNumber,
	string? ReceiptCode,
	string? FiscalRegisterNumber,
	string? Currency,
	string? PurchasedItemName,
	string? StructuredPayloadJson,
	string? RawPayloadJson,
	string? ErrorMessage,
	string? UsedModel = null
);