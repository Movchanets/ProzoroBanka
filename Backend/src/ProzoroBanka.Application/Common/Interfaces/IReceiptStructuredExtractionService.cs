using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IReceiptStructuredExtractionService
{
	Task<ReceiptStructuredExtractionResult> ExtractAsync(
		Stream receiptImage,
		string fileName,
		string? modelIdentifier,
		CancellationToken ct);
}