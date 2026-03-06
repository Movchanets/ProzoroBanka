namespace ProzoroBanka.Application.Common.Models;

public record OcrResult(
    bool Success,
    string? MerchantName,
    decimal? TotalAmount,
    DateTime? TransactionDate,
    string? RawJson,
    string? ErrorMessage
);
