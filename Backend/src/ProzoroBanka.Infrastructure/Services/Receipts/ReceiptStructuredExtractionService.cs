using System.Text.Json;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class ReceiptStructuredExtractionService : IReceiptStructuredExtractionService
{
	private readonly IOcrServiceFactory _ocrFactory;

	public ReceiptStructuredExtractionService(IOcrServiceFactory ocrFactory)
	{
		_ocrFactory = ocrFactory;
	}

	public async Task<ReceiptStructuredExtractionResult> ExtractAsync(Stream receiptImage, string fileName, string? modelIdentifier, CancellationToken ct)
	{
		var (service, usedModel) = await _ocrFactory.ResolveAsync(modelIdentifier, ct);
		var result = await service.ParseReceiptAsync(receiptImage, fileName, usedModel, ct);
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
				null,
				result.RawJson,
				result.ErrorMessage ?? "OCR extraction failed",
				usedModel);
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
				fiscalNumber = TryGetString(root, "fiscalNumber", "fiscal_number");
				receiptCode = TryGetString(root, "receiptCode", "receipt_number");
				currency = TryGetString(root, "currency");
				purchasedItemName = TryGetString(root, "purchasedItemName", "purchased_item_name")
					?? TryGetFirstItemName(root);
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
			result.FiscalRegisterNumber ?? fiscalNumber,
			result.FiscalReceiptNumber ?? receiptCode,
			result.FiscalRegisterNumber ?? fiscalNumber, // FiscalRegisterNumber explicit field
			currency,
			purchasedItemName,
			result.RawJson,
			result.RawJson,
			null,
			usedModel);
	}

	private static string? TryGetString(JsonElement root, params string[] propertyNames)
	{
		foreach (var property in propertyNames)
		{
			if (!root.TryGetProperty(property, out var value) || value.ValueKind == JsonValueKind.Null)
				continue;

			if (value.ValueKind == JsonValueKind.String)
				return value.GetString();

			if (value.ValueKind == JsonValueKind.Number)
				return value.GetRawText();
		}

		return null;
	}

	private static string? TryGetFirstItemName(JsonElement root)
	{
		if (!root.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array || items.GetArrayLength() == 0)
			return null;

		var first = items[0];
		if (first.ValueKind != JsonValueKind.Object)
			return null;

		return TryGetString(first, "name", "item_name", "title");
	}
}
