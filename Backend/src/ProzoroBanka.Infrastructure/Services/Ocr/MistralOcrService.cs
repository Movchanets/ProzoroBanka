using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Mistral native OCR API (/v1/ocr) service.
/// Uses document_annotation_format with strict JSON schema for fiscal receipt parsing.
/// </summary>
public class MistralOcrService : IOcrService
{
	private readonly HttpClient _httpClient;
	private readonly ILogger<MistralOcrService> _logger;

	public string ProviderName => "MistralNative";

	public MistralOcrService(HttpClient httpClient, ILogger<MistralOcrService> logger)
	{
		_httpClient = httpClient;
		_logger = logger;
	}

	public async Task<OcrResult> ParseReceiptAsync(Stream imageStream, string fileName, string? modelIdentifier = null, CancellationToken ct = default)
	{
		var model = !string.IsNullOrWhiteSpace(modelIdentifier) ? modelIdentifier : "mistral-ocr-latest";
		try
		{
			_logger.LogInformation("Mistral OCR: parsing receipt {FileName} with model {Model}", fileName, model);

			using var ms = new MemoryStream();
			await imageStream.CopyToAsync(ms, ct);
			var base64 = Convert.ToBase64String(ms.ToArray());
			var mimeType = GetMimeType(fileName);
			var dataUrl = $"data:{mimeType};base64,{base64}";

			var request = new
			{
				model = model,
				include_image_base64 = true,
				document = new
				{
					type = "image_url",
					image_url = dataUrl
				},
				document_annotation_format = new
				{
					type = "json_schema",
					json_schema = FiscalReceiptSchema.Schema
				}
			};

			var response = await _httpClient.PostAsJsonAsync("/v1/ocr", request, ct);
			var responseBody = await response.Content.ReadAsStringAsync(ct);

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning(
					"Mistral OCR returned HTTP {StatusCode} for {FileName}. Body: {Body}",
					(int)response.StatusCode,
					fileName,
					Truncate(responseBody));
				return Failure($"Mistral OCR HTTP {(int)response.StatusCode}: {Truncate(responseBody)}");
			}

			_logger.LogDebug("Mistral OCR response body for {FileName}: {Body}", fileName, Truncate(responseBody, 2000));

			if (!TryExtractStructuredPayload(responseBody, out var rawContent, out var source, out var diagnostic))
			{
				_logger.LogWarning(
					"Mistral OCR response for {FileName} has no structured JSON in supported fields (document_annotation/markdown). Diagnostic: {Diagnostic}",
					fileName,
					diagnostic);
				return Failure("No structured JSON found in Mistral OCR response");
			}

			_logger.LogInformation("Mistral OCR extracted structured payload for {FileName} from {Source}", fileName, source);
			_logger.LogDebug("Mistral OCR structured payload for {FileName}: {Payload}", fileName, Truncate(rawContent, 2000));

			return ParseFiscalJson(rawContent, fileName);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Mistral OCR failed for {FileName}", fileName);
			return Failure(ex.Message);
		}
	}

	private OcrResult ParseFiscalJson(string content, string fileName)
	{
		try
		{
			// Strip markdown fences if present
			var json = ExtractJson(content);
			if (json is null)
				return Failure("No JSON found in Mistral OCR response");

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

			_logger.LogInformation("Mistral OCR parsed: Merchant={Merchant}, Total={Total}, FN={FN}, RN={RN}",
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
			_logger.LogWarning(ex, "Mistral OCR: failed to parse fiscal JSON for {FileName}", fileName);
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

	private static bool TryExtractStructuredPayload(string responseBody, out string payloadJson, out string source, out string diagnostic)
	{
		payloadJson = string.Empty;
		source = string.Empty;
		diagnostic = string.Empty;

		if (string.IsNullOrWhiteSpace(responseBody))
		{
			diagnostic = "response body is empty";
			return false;
		}

		using var doc = JsonDocument.Parse(responseBody);
		var root = doc.RootElement;

		if (root.TryGetProperty("pages", out var pages) && pages.ValueKind == JsonValueKind.Array && pages.GetArrayLength() > 0)
		{
			var firstPage = pages[0];

			if (firstPage.TryGetProperty("document_annotation", out var annotation) && annotation.ValueKind == JsonValueKind.Object)
			{
				payloadJson = annotation.GetRawText();
				source = "pages[0].document_annotation";
				return true;
			}

			if (firstPage.TryGetProperty("document_annotation", out var annotationString) && annotationString.ValueKind == JsonValueKind.String)
			{
				var value = annotationString.GetString();
				if (!string.IsNullOrWhiteSpace(value))
				{
					payloadJson = value;
					source = "pages[0].document_annotation(string)";
					return true;
				}
			}

			if (firstPage.TryGetProperty("markdown", out var markdown) && markdown.ValueKind == JsonValueKind.String)
			{
				var jsonFromMarkdown = ExtractJson(markdown.GetString() ?? string.Empty);
				if (!string.IsNullOrWhiteSpace(jsonFromMarkdown))
				{
					payloadJson = jsonFromMarkdown;
					source = "pages[0].markdown";
					return true;
				}
			}
		}

		if (root.TryGetProperty("document_annotation", out var topAnnotation) && topAnnotation.ValueKind == JsonValueKind.Object)
		{
			payloadJson = topAnnotation.GetRawText();
			source = "document_annotation";
			return true;
		}

		if (root.TryGetProperty("document_annotation", out var topAnnotationString) && topAnnotationString.ValueKind == JsonValueKind.String)
		{
			var value = topAnnotationString.GetString();
			if (!string.IsNullOrWhiteSpace(value))
			{
				payloadJson = value;
				source = "document_annotation(string)";
				return true;
			}
		}

		diagnostic = root.TryGetProperty("document_annotation", out var annotationKind)
			? $"document_annotation kind: {annotationKind.ValueKind}"
			: "document_annotation missing";

		return false;
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

	private static string Truncate(string value, int maxLength = 600)
	{
		if (string.IsNullOrWhiteSpace(value))
			return "<empty>";

		return value.Length <= maxLength ? value : $"{value[..maxLength]}...";
	}

}

/// <summary>
/// Flat fiscal-receipt JSON schema for Mistral strict mode.
/// All identifiers are strings to preserve leading zeros.
/// </summary>
internal static class FiscalReceiptSchema
{
	public static object Schema => new
	{
		name = "response_schema",
		schema = new
		{
			type = "object",
			properties = new
			{
				date = new { type = "string", description = "Дата транзакції СУВОРО у форматі YYYY-MM-DD" },
					merchant_name = new { type = "string", description = "Назва продавця/магазину" },
					address = new { type = "string", description = "Адреса магазину" },
					tax_number = new { type = "string", description = "Податковий номер продавця (ПН/ІПН)" },
				fiscal_number = new { type = "string", description = "Фіскальний номер РРО (ФН). Повертати як рядок, щоб зберегти нулі." },
				receipt_number = new { type = "string", description = "Локальний номер чека (ФН чека або ЧЕК №). Брати тільки основний номер чека та не додавати службові або додаткові цифри справа. Видалити пробіли та скісні риски, але повернути як рядок." },
				time = new { type = "string", description = "Час транзакції СУВОРО у форматі HH:mm:ss" },
					total_amount = new { type = "number", description = "Загальна сума чека (РАЗОМ або СУМА)" },
					currency = new { type = "string", description = "Валюта (UAH/грн)" },
					payment_method = new { type = "string", description = "Спосіб оплати (готівка/картка/безготівкова)" },
					card_mask = new { type = "string", description = "Маскований номер картки, якщо присутній" },
					rrn = new { type = "string", description = "RRN транзакції, якщо присутній" },
					barcode = new { type = "string", description = "Штрих-код головного товару або чека" },
					vat_rate = new { type = "number", description = "Ставка ПДВ у відсотках" },
					vat_amount = new { type = "number", description = "Сума ПДВ" },
					items = new
					{
						type = "array",
						description = "Список товарних позицій",
						items = new
						{
							type = "object",
							properties = new
							{
								name = new { type = "string", description = "Назва товару" },
								quantity = new { type = "number", description = "Кількість" },
								unit_price = new { type = "number", description = "Ціна за одиницю" },
								total_price = new { type = "number", description = "Підсумок за позицію" },
								barcode = new { type = "string", description = "Штрих-код позиції" },
								vat_rate = new { type = "number", description = "Ставка ПДВ для позиції" },
								vat_amount = new { type = "number", description = "Сума ПДВ для позиції" }
							},
							required = new[] { "name" },
							additionalProperties = false
						}
					}
			},
			required = new[] { "date", "time", "fiscal_number", "receipt_number", "total_amount" },
			additionalProperties = false
		},
		strict = true
	};
}
