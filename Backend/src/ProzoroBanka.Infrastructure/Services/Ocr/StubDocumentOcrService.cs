using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

public class StubDocumentOcrService : IDocumentOcrService
{
	public Task<DocumentOcrResult> ParseDocumentAsync(
		Stream imageStream,
		string fileName,
		DocumentType type,
		string? modelIdentifier = null,
		CancellationToken ct = default)
	{
		var usedModel = string.IsNullOrWhiteSpace(modelIdentifier) ? "stub-model" : modelIdentifier;
		var rawJson = $$"""
{"source":"stub","fileName":"{{fileName}}","type":"{{type}}","model":"{{usedModel}}"}
""";

		var items = type is DocumentType.Waybill or DocumentType.Invoice
			? new[]
			{
				new OcrParsedItem("Stub Item 1", 10.5m, 100m, 1050m),
				new OcrParsedItem("Stub Item 2", 1m, 500m, 500m)
			}
			: Array.Empty<OcrParsedItem>();

		var totalAmount = type is DocumentType.Waybill or DocumentType.Invoice ? 1550m : 123.45m;

		return Task.FromResult(new DocumentOcrResult(
			true,
			"OCR Stub Counterparty",
			new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
			totalAmount,
			items,
			rawJson,
			null)
		{
			Edrpou = type == DocumentType.BankReceipt ? "12345678" : null,
			PayerFullName = type == DocumentType.BankReceipt ? "Ivanov Ivan" : null,
			ReceiptCode = type == DocumentType.BankReceipt ? "RC-999-000" : null,
			PaymentPurpose = type == DocumentType.BankReceipt ? "Payment for services" : null,
			SenderIban = type == DocumentType.BankReceipt ? "UA112233440000012345678901234" : null,
			ReceiverIban = type == DocumentType.BankReceipt ? "UA443322110000098765432109876" : null
		});
	}
}