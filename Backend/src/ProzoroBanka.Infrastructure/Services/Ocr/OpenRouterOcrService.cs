using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// OpenRouter OCR API (/v1/chat/completions) service.
/// Universal provider for models like qwen-vl-plus or pixtral.
/// Uses strict json_object response format.
/// </summary>
public class OpenRouterOcrService : IOcrService
{
	private readonly HttpClient _httpClient;
	private readonly ILogger<OpenRouterOcrService> _logger;

	public string ProviderName => "OpenRouter";

	public OpenRouterOcrService(HttpClient httpClient, ILogger<OpenRouterOcrService> logger)
	{
		_httpClient = httpClient;
		_logger = logger;
	}

	public async Task<OcrResult> ParseReceiptAsync(Stream imageStream, string fileName, string? modelIdentifier = null, CancellationToken ct = default)
	{
		var model = !string.IsNullOrWhiteSpace(modelIdentifier) ? modelIdentifier : "qwen/qwen-vl-plus:free";
		
		try
		{
			_logger.LogInformation("OpenRouter OCR: parsing receipt {FileName} using model {Model}", fileName, model);

			using var ms = new MemoryStream();
			await imageStream.CopyToAsync(ms, ct);
			var base64 = Convert.ToBase64String(ms.ToArray());
			var mimeType = GetMimeType(fileName);

			var request = new
			{
				model = model,
				response_format = new { type = "json_object" },
				messages = new object[]
				{
					new
					{
						role = "system",
						content = "Return ONLY valid JSON object with schema:\n" +
						          "{\n" +
						          "  \"type\": \"object\",\n" +
						          "  \"properties\": {\n" +
						          "    \"Date\": {\"type\": \"string\"},\n" +
						          "    \"FiscalNumber\": {\"type\": \"string\"},\n" +
								"    \"ReceiptNumber\": {\"type\": \"string\"},\n" +
						          "    \"Time\": {\"type\": \"string\"},\n" +
						          "    \"TotalAmount\": {\"type\": \"number\"}\n" +
						          "  },\n" +
						          "  \"required\": [\"Date\",\"Time\",\"FiscalNumber\",\"ReceiptNumber\",\"TotalAmount\"]\n" +
						          "}\n" +
								"Constraints: Date must be YYYY-MM-DD, Time must be HH:mm:ss, FiscalNumber and ReceiptNumber must remain strings. ReceiptNumber must contain only the main receipt id; do not append extra digits, checksum-like digits, or trailing numbers shown to the right of the number in the receipt image."
					},
					new
					{
						role = "user",
						content = new object[]
						{
							new { type = "image_url", image_url = new { url = $"data:{mimeType};base64,{base64}" } }
						}
					}
				}
			};

			var response = await _httpClient.PostAsJsonAsync("/v1/chat/completions", request, ct);
			response.EnsureSuccessStatusCode();

			var result = await response.Content.ReadFromJsonAsync<OpenRouterResponse>(cancellationToken: ct);

			var rawContent = result?.Choices?.FirstOrDefault()?.Message?.Content;
			if (string.IsNullOrWhiteSpace(rawContent))
				return Failure("No content returned from OpenRouter");

			_logger.LogDebug("OpenRouter raw response: {Raw}", rawContent);

			return ParseFiscalJson(rawContent, fileName);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "OpenRouter OCR failed for {FileName}", fileName);
			return Failure(ex.Message);
		}
	}

	private OcrResult ParseFiscalJson(string content, string fileName)
	{
		try
		{
			var json = ExtractJson(content);
			if (json is null)
				return Failure("No JSON found in OpenRouter response");

			using var doc = JsonDocument.Parse(json);
			var root = doc.RootElement;

			var date = GetString(root, "Date") ?? GetString(root, "date");
			var time = GetString(root, "Time") ?? GetString(root, "time");
			var fiscalRegister = GetString(root, "FiscalNumber") ?? GetString(root, "fiscal_number");
			var receiptNumber = GetString(root, "ReceiptNumber") ?? GetString(root, "receipt_number");
			var merchant = GetString(root, "MerchantName") ?? GetString(root, "merchant_name");
			var total = GetDecimal(root, "TotalAmount") ?? GetDecimal(root, "total_amount");

			DateTime? transactionDate = null;
			if (!string.IsNullOrWhiteSpace(date))
			{
				var combined = string.IsNullOrWhiteSpace(time) ? date : $"{date}T{time}";
				if (DateTime.TryParse(combined, out var dt))
					transactionDate = dt;
			}

			_logger.LogInformation("OpenRouter OCR parsed: Merchant={Merchant}, Total={Total}, FN={FN}, RN={RN}",
				merchant, total, fiscalRegister, receiptNumber);

			return new OcrResult(
				Success: true,
				MerchantName: merchant,
				TotalAmount: total,
				TransactionDate: transactionDate,
				FiscalRegisterNumber: fiscalRegister,
				FiscalReceiptNumber: receiptNumber,
				TransactionTime: time,
				RawJson: json,
				ErrorMessage: null);
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "OpenRouter OCR: failed to parse JSON for {FileName}", fileName);
			return Failure($"JSON parse error: {ex.Message}");
		}
	}

	private static string? ExtractJson(string content)
	{
		if (string.IsNullOrWhiteSpace(content)) return null;
		var start = content.IndexOf('{');
		var end = content.LastIndexOf('}');
		if (start < 0 || end <= start) return null;
		return content[start..(end + 1)];
	}

	private static string? GetString(JsonElement root, string key)
	{
		if (root.TryGetProperty(key, out var el) && el.ValueKind != JsonValueKind.Null)
			return el.GetString();
		return null;
	}

	private static decimal? GetDecimal(JsonElement root, string key)
	{
		if (!root.TryGetProperty(key, out var value) || value.ValueKind == JsonValueKind.Null)
			return null;

		if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var numericValue))
			return numericValue;

		if (value.ValueKind == JsonValueKind.String &&
			decimal.TryParse(value.GetString(), System.Globalization.NumberStyles.Any,
				System.Globalization.CultureInfo.InvariantCulture, out var stringValue))
			return stringValue;

		return null;
	}

	private static string GetMimeType(string fileName) =>
		Path.GetExtension(fileName).ToLowerInvariant() switch
		{
			".jpg" or ".jpeg" => "image/jpeg",
			".png" => "image/png",
			".webp" => "image/webp",
			".pdf" => "application/pdf",
			_ => "application/octet-stream"
		};

	private static OcrResult Failure(string error) =>
		new(false, null, null, null, null, null, null, null, error);

	// ── Response models ──

	private class OpenRouterResponse
	{
		[JsonPropertyName("choices")]
		public List<OpenRouterChoice> Choices { get; set; } = new();
	}

	private class OpenRouterChoice
	{
		[JsonPropertyName("message")]
		public OpenRouterMessage Message { get; set; } = new();
	}

	private class OpenRouterMessage
	{
		[JsonPropertyName("content")]
		public string Content { get; set; } = string.Empty;
	}
}
