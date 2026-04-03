using System.Text.Json;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class ReceiptStructuredExtractionService : IReceiptStructuredExtractionService
{
	private readonly IOcrService _ocrService;

	public ReceiptStructuredExtractionService(IOcrService ocrService)
	{
		_ocrService = ocrService;
	}

	public async Task<ReceiptStructuredExtractionResult> ExtractAsync(Stream receiptImage, string fileName, CancellationToken ct)
	{
		var result = await _ocrService.ParseReceiptAsync(receiptImage, fileName, ct);
		if (!result.Success)
		{
			return new ReceiptStructuredExtractionResult(
				false,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				result.RawJson,
				result.ErrorMessage ?? "OCR extraction failed");
		}

		string? fiscalNumber = null;
		string? receiptCode = null;
		string? currency = null;
		string? purchasedItemName = null;
		if (!string.IsNullOrWhiteSpace(result.RawJson))
		{
			try
			{
				using var document = JsonDocument.Parse(result.RawJson);
				var root = document.RootElement;
				fiscalNumber = TryGetString(root, "fiscalNumber");
				receiptCode = TryGetString(root, "receiptCode");
				currency = TryGetString(root, "currency");
				purchasedItemName = TryGetString(root, "purchasedItemName") ?? TryGetFirstItemName(root);
			}
			catch
			{
				// If provider payload is not JSON, we keep structured fields null and still preserve raw payload.
			}
		}

		return new ReceiptStructuredExtractionResult(
			true,
			result.MerchantName,
			result.TotalAmount,
			result.TransactionDate,
			fiscalNumber,
			receiptCode,
			currency,
			purchasedItemName,
			result.RawJson,
			result.RawJson,
			null);
	}

	private static string? TryGetString(JsonElement root, string property)
	{
		if (!root.TryGetProperty(property, out var value) || value.ValueKind == JsonValueKind.Null)
			return null;
		return value.GetString();
	}

	private static string? TryGetFirstItemName(JsonElement root)
	{
		if (!root.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array || items.GetArrayLength() == 0)
			return null;

		var first = items[0];
		if (first.ValueKind != JsonValueKind.Object)
			return null;

		return first.TryGetProperty("name", out var name) ? name.GetString() : null;
	}
}
