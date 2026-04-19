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
    string? ErrorMessage
);

public interface IDocumentOcrService
{
    Task<DocumentOcrResult> ParseDocumentAsync(Stream imageStream, string fileName, DocumentType type, string? modelIdentifier = null, CancellationToken ct = default);
}
