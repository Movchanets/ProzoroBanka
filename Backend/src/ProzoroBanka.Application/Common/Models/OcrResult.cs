namespace ProzoroBanka.Application.Common.Models;

public record OcrResult(
    bool Success,
    string? MerchantName,
    decimal? TotalAmount,
    DateTime? TransactionDate,
    string? FiscalRegisterNumber,
    string? FiscalReceiptNumber,
    string? TransactionTime,
    string? RawJson,
    string? ErrorMessage
);
