using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Azure AI Document Intelligence (F0 Free Tier) — primary OCR provider.
/// Використовує prebuilt-receipt модель.
/// </summary>
public class AzureDocumentIntelligenceOcrService : IOcrService
{
	private readonly DocumentAnalysisClient _client;
	private readonly ILogger<AzureDocumentIntelligenceOcrService> _logger;

	public string ProviderName => "AzureDocumentIntelligence";

	public AzureDocumentIntelligenceOcrService(
		DocumentAnalysisClient client,
		ILogger<AzureDocumentIntelligenceOcrService> logger)
	{
		_client = client;
		_logger = logger;
	}

	public async Task<OcrResult> ParseReceiptAsync(Stream imageStream, string fileName, CancellationToken ct = default)
	{
		try
		{
			_logger.LogInformation("Azure Document Intelligence: parsing receipt {FileName}", fileName);

			var operation = await _client.AnalyzeDocumentAsync(
				WaitUntil.Completed,
				"prebuilt-receipt",
				imageStream,
				cancellationToken: ct);

			var result = operation.Value;

			if (result.Documents.Count == 0)
			{
				return new OcrResult(false, null, null, null, null, "No documents found in image");
			}

			var document = result.Documents[0];

			string? merchantName = null;
			decimal? totalAmount = null;
			DateTime? transactionDate = null;

			if (document.Fields.TryGetValue("MerchantName", out var merchantField))
				merchantName = merchantField.Value.AsString();

			if (document.Fields.TryGetValue("Total", out var totalField))
				totalAmount = (decimal?)totalField.Value.AsDouble();

			if (document.Fields.TryGetValue("TransactionDate", out var dateField))
				transactionDate = dateField.Value.AsDate().DateTime;

			_logger.LogInformation("Azure DI parsed: Merchant={Merchant}, Total={Total}, Date={Date}",
				merchantName, totalAmount, transactionDate);

			return new OcrResult(
				Success: true,
				MerchantName: merchantName,
				TotalAmount: totalAmount,
				TransactionDate: transactionDate,
				RawJson: result.Content,
				ErrorMessage: null
			);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Azure Document Intelligence OCR failed for {FileName}", fileName);
			return new OcrResult(false, null, null, null, null, ex.Message);
		}
	}
}
