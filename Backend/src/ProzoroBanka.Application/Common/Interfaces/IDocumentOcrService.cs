using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Common.Interfaces;

public record OcrParsedItem(
    string Name,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalPrice
);

public record DocumentOcrResult(
    bool Success,
    string? CounterpartyName,
    DateTime? DocumentDate,
    decimal? TotalAmount,
    IReadOnlyList<OcrParsedItem> Items,
    string? RawJson,
    string? ErrorMessage,
    string? Edrpou = null,
    string? PayerFullName = null,
    string? ReceiptCode = null,
    string? PaymentPurpose = null,
    string? SenderIban = null,
    string? ReceiverIban = null
);

public interface IDocumentOcrService
{
    Task<DocumentOcrResult> ParseDocumentAsync(Stream imageStream, string fileName, DocumentType type, string? modelIdentifier = null, CancellationToken ct = default);
}
