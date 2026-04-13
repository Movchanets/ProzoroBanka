using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
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

			var completionsEndpoint = GetCompletionsEndpoint();
			var response = await _httpClient.PostAsJsonAsync(completionsEndpoint, request, ct);
			var responseBody = await response.Content.ReadAsStringAsync(ct);
			var statusCode = (int)response.StatusCode;
			var requestUri = response.RequestMessage?.RequestUri?.ToString() ?? "<unknown>";
			var contentType = response.Content.Headers.ContentType?.MediaType ?? "<missing>";

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning(
					"OpenRouter OCR returned HTTP {StatusCode} for {FileName}. Uri: {RequestUri}. ContentType: {ContentType}. Body: {Body}",
					statusCode,
					fileName,
					requestUri,
					contentType,
					Truncate(responseBody));
				return Failure($"OpenRouter OCR HTTP {statusCode}: {Truncate(responseBody)}");
			}

			if (LooksLikeHtml(responseBody))
			{
				_logger.LogWarning(
					"OpenRouter OCR returned HTML-like response for {FileName}. Uri: {RequestUri}. ContentType: {ContentType}. Body: {Body}",
					fileName,
					requestUri,
					contentType,
					Truncate(responseBody));
				return Failure("OpenRouter OCR returned non-JSON HTML response");
			}

			if (!IsJsonContentType(contentType) && !LooksLikeJson(responseBody))
			{
				_logger.LogWarning(
					"OpenRouter OCR returned unexpected content-type for {FileName}. Uri: {RequestUri}. ContentType: {ContentType}. Body: {Body}",
					fileName,
					requestUri,
					contentType,
					Truncate(responseBody));
				return Failure($"OpenRouter OCR returned non-JSON response (content-type: {contentType})");
			}

			if (TryExtractTopLevelError(responseBody, out var upstreamCode, out var upstreamMessage))
			{
				_logger.LogWarning(
					"OpenRouter OCR returned provider error payload for {FileName}. Uri: {RequestUri}. UpstreamCode: {UpstreamCode}. Message: {Message}",
					fileName,
					requestUri,
					upstreamCode,
					upstreamMessage);
				return Failure($"OpenRouter OCR upstream error ({upstreamCode}): {upstreamMessage}");
			}

			if (!TryExtractModelContent(responseBody, out var rawContent, out var diagnostic))
			{
				_logger.LogWarning(
					"OpenRouter OCR response envelope is invalid for {FileName}. Uri: {RequestUri}. Diagnostic: {Diagnostic}. Body: {Body}",
					fileName,
					requestUri,
					diagnostic,
					Truncate(responseBody));
				return Failure($"OpenRouter OCR invalid response envelope: {diagnostic}");
			}

			_logger.LogDebug("OpenRouter raw model content for {FileName}: {Raw}", fileName, Truncate(rawContent, 2000));

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

	private Uri GetCompletionsEndpoint()
	{
		var baseAddress = _httpClient.BaseAddress;
		if (baseAddress is null)
			return new Uri("https://openrouter.ai/api/v1/chat/completions", UriKind.Absolute);

		if (!baseAddress.Host.EndsWith("openrouter.ai", StringComparison.OrdinalIgnoreCase))
			return new Uri(baseAddress, "v1/chat/completions");

		var path = baseAddress.AbsolutePath.TrimEnd('/');
		var hasApiPrefix = path.Equals("/api", StringComparison.OrdinalIgnoreCase)
			|| path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase);

		if (hasApiPrefix)
			return new Uri(baseAddress, "/api/v1/chat/completions");

		_logger.LogWarning(
			"OpenRouter BaseAddress {BaseAddress} is missing '/api' path segment. Falling back to canonical endpoint.",
			baseAddress);
		return new Uri(baseAddress, "/api/v1/chat/completions");
	}

	private static bool IsJsonContentType(string contentType) =>
		contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase)
		|| contentType.Contains("application/problem+json", StringComparison.OrdinalIgnoreCase)
		|| contentType.Contains("text/json", StringComparison.OrdinalIgnoreCase);

	private static bool LooksLikeHtml(string value)
	{
		if (string.IsNullOrWhiteSpace(value))
			return false;

		var trimmed = value.TrimStart();
		return trimmed.StartsWith("<", StringComparison.Ordinal)
			|| trimmed.StartsWith("<!doctype", StringComparison.OrdinalIgnoreCase)
			|| trimmed.StartsWith("<html", StringComparison.OrdinalIgnoreCase);
	}

	private static bool LooksLikeJson(string value)
	{
		if (string.IsNullOrWhiteSpace(value))
			return false;

		var trimmed = value.TrimStart();
		return trimmed.StartsWith("{", StringComparison.Ordinal) || trimmed.StartsWith("[", StringComparison.Ordinal);
	}

	private static bool TryExtractModelContent(string responseBody, out string content, out string diagnostic)
	{
		content = string.Empty;
		diagnostic = string.Empty;

		if (string.IsNullOrWhiteSpace(responseBody))
		{
			diagnostic = "response body is empty";
			return false;
		}

		try
		{
			using var doc = JsonDocument.Parse(responseBody);
			var root = doc.RootElement;

			if (!root.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array || choices.GetArrayLength() == 0)
			{
				diagnostic = "choices[] is missing or empty";
				return false;
			}

			var firstChoice = choices[0];
			if (!firstChoice.TryGetProperty("message", out var message) || message.ValueKind != JsonValueKind.Object)
			{
				diagnostic = "choices[0].message is missing";
				return false;
			}

			if (!message.TryGetProperty("content", out var rawContent) || rawContent.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
			{
				diagnostic = "choices[0].message.content is missing";
				return false;
			}

			if (rawContent.ValueKind == JsonValueKind.String)
			{
				content = rawContent.GetString() ?? string.Empty;
				if (!string.IsNullOrWhiteSpace(content))
					return true;

				diagnostic = "choices[0].message.content is empty";
				return false;
			}

			if (rawContent.ValueKind == JsonValueKind.Array)
			{
				var sb = new StringBuilder();
				foreach (var item in rawContent.EnumerateArray())
				{
					if (item.ValueKind == JsonValueKind.String)
					{
						sb.Append(item.GetString());
						continue;
					}

					if (item.ValueKind == JsonValueKind.Object
						&& item.TryGetProperty("text", out var textElement)
						&& textElement.ValueKind == JsonValueKind.String)
					{
						sb.Append(textElement.GetString());
					}
				}

				content = sb.ToString();
				if (!string.IsNullOrWhiteSpace(content))
					return true;

				diagnostic = "choices[0].message.content array has no text content";
				return false;
			}

			diagnostic = $"unsupported content kind: {rawContent.ValueKind}";
			return false;
		}
		catch (JsonException ex)
		{
			diagnostic = $"response is not valid JSON: {ex.Message}";
			return false;
		}
	}

	private static bool TryExtractTopLevelError(string responseBody, out int code, out string message)
	{
		code = 0;
		message = string.Empty;

		if (string.IsNullOrWhiteSpace(responseBody))
			return false;

		try
		{
			using var doc = JsonDocument.Parse(responseBody);
			var root = doc.RootElement;

			if (!root.TryGetProperty("error", out var error) || error.ValueKind != JsonValueKind.Object)
				return false;

			if (error.TryGetProperty("code", out var codeElement))
			{
				if (codeElement.ValueKind == JsonValueKind.Number && codeElement.TryGetInt32(out var intCode))
					code = intCode;
				else if (codeElement.ValueKind == JsonValueKind.String)
					_ = int.TryParse(codeElement.GetString(), out code);
			}

			if (error.TryGetProperty("message", out var messageElement) && messageElement.ValueKind == JsonValueKind.String)
				message = messageElement.GetString() ?? string.Empty;

			return !string.IsNullOrWhiteSpace(message) || code != 0;
		}
		catch (JsonException)
		{
			return false;
		}
	}

	private static string Truncate(string value, int maxLength = 600)
	{
		if (string.IsNullOrWhiteSpace(value))
			return "<empty>";

		return value.Length <= maxLength ? value : $"{value[..maxLength]}...";
	}
}
