using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class StubReceiptStructuredExtractionService : IReceiptStructuredExtractionService
{
	public Task<ReceiptStructuredExtractionResult> ExtractAsync(Stream receiptImage, string fileName, string? modelIdentifier, CancellationToken ct)
	{
		var now = DateTime.UtcNow;
		var payload = "{\"source\":\"stub\",\"merchant\":\"OCR Stub Merchant\",\"fiscalNumber\":\"STUB-FISCAL-0001\"}";
		var usedModel = string.IsNullOrWhiteSpace(modelIdentifier) ? "stub-model" : modelIdentifier;

		return Task.FromResult(new ReceiptStructuredExtractionResult(
			true,
			"OCR Stub Merchant",
			123.45m,
			now,
			"STUB-FISCAL-0001",
			"STUB-CODE-0001",
			"STUB-FISCAL-0001",
			"UAH",
			"Тестовий товар",
			payload,
			payload,
			null,
			usedModel));
	}
}
