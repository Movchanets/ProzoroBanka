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
		if (type == DocumentType.TransferAct)
		{
			return Task.FromResult(new DocumentOcrResult(
				false,
				null,
				null,
				null,
				null,
				null,
				"OCR is forbidden for Transfer Acts for security reasons."));
		}

		var usedModel = string.IsNullOrWhiteSpace(modelIdentifier) ? "stub-model" : modelIdentifier;
		var rawJson = $$"""
{"source":"stub","fileName":"{{fileName}}","type":"{{type}}","model":"{{usedModel}}"}
""";

		return Task.FromResult(new DocumentOcrResult(
			true,
			"OCR Stub Counterparty",
			new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
			123.45m,
			null,
			rawJson,
			null));
	}
}