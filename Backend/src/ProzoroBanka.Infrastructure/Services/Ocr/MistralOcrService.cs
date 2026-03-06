using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Mistral API (/v1/ocr) — fallback OCR provider з typed HttpClient.
/// Використовує strict JSON schema для парсингу відповіді.
/// </summary>
public class MistralOcrService : IOcrService
{
	private readonly HttpClient _httpClient;
	private readonly ILogger<MistralOcrService> _logger;

	public string ProviderName => "MistralOcr";

	public MistralOcrService(HttpClient httpClient, ILogger<MistralOcrService> logger)
	{
		_httpClient = httpClient;
		_logger = logger;
	}

	public async Task<OcrResult> ParseReceiptAsync(Stream imageStream, string fileName, CancellationToken ct = default)
	{
		try
		{
			_logger.LogInformation("Mistral OCR: parsing receipt {FileName}", fileName);

			// Конвертуємо зображення в base64
			using var ms = new MemoryStream();
			await imageStream.CopyToAsync(ms, ct);
			var base64 = Convert.ToBase64String(ms.ToArray());
			var mimeType = GetMimeType(fileName);

			var request = new MistralOcrRequest
			{
				Model = "mistral-ocr-latest",
				Document = new MistralDocument
				{
					Type = "image_url",
					ImageUrl = $"data:{mimeType};base64,{base64}"
				},
				JsonSchema = MistralReceiptSchema.Schema
			};

			var response = await _httpClient.PostAsJsonAsync("/v1/ocr", request, ct);
			response.EnsureSuccessStatusCode();

			var result = await response.Content.ReadFromJsonAsync<MistralOcrResponse>(cancellationToken: ct);

			if (result?.Pages is not { Count: > 0 })
				return new OcrResult(false, null, null, null, null, "No pages returned from Mistral OCR");

			// Парсимо структуровані дані з markdown
			var rawContent = string.Join("\n", result.Pages.Select(p => p.Markdown));

			// Спробуємо розпарсити JSON з відповіді
			var parsed = TryParseReceipt(rawContent);

			_logger.LogInformation("Mistral OCR parsed: Merchant={Merchant}, Total={Total}",
				parsed.MerchantName, parsed.TotalAmount);

			return new OcrResult(
				Success: true,
				MerchantName: parsed.MerchantName,
				TotalAmount: parsed.TotalAmount,
				TransactionDate: parsed.TransactionDate,
				RawJson: rawContent,
				ErrorMessage: null
			);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Mistral OCR failed for {FileName}", fileName);
			return new OcrResult(false, null, null, null, null, ex.Message);
		}
	}

	private static string GetMimeType(string fileName)
	{
		var ext = Path.GetExtension(fileName).ToLowerInvariant();
		return ext switch
		{
			".jpg" or ".jpeg" => "image/jpeg",
			".png" => "image/png",
			".webp" => "image/webp",
			".pdf" => "application/pdf",
			_ => "application/octet-stream"
		};
	}

	private static (string? MerchantName, decimal? TotalAmount, DateTime? TransactionDate) TryParseReceipt(string content)
	{
		try
		{
			// Спроба розпарсити JSON, якщо Mistral повернув структурований формат
			if (content.Contains('{'))
			{
				var jsonStart = content.IndexOf('{');
				var jsonEnd = content.LastIndexOf('}') + 1;
				if (jsonEnd > jsonStart)
				{
					var jsonStr = content[jsonStart..jsonEnd];
					var parsed = JsonSerializer.Deserialize<MistralReceiptResult>(jsonStr,
						new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

					if (parsed != null)
						return (parsed.MerchantName, parsed.TotalAmount, parsed.TransactionDate);
				}
			}
		}
		catch
		{
			// Fallback: не вдалося розпарсити JSON
		}

		return (null, null, null);
	}

	// ── Request/Response models ──

	private class MistralOcrRequest
	{
		[JsonPropertyName("model")]
		public string Model { get; set; } = string.Empty;

		[JsonPropertyName("document")]
		public MistralDocument Document { get; set; } = null!;

		[JsonPropertyName("json_schema")]
		public object? JsonSchema { get; set; }
	}

	private class MistralDocument
	{
		[JsonPropertyName("type")]
		public string Type { get; set; } = string.Empty;

		[JsonPropertyName("image_url")]
		public string ImageUrl { get; set; } = string.Empty;
	}

	private class MistralOcrResponse
	{
		[JsonPropertyName("pages")]
		public List<MistralPage> Pages { get; set; } = new();
	}

	private class MistralPage
	{
		[JsonPropertyName("markdown")]
		public string Markdown { get; set; } = string.Empty;
	}

	private class MistralReceiptResult
	{
		public string? MerchantName { get; set; }
		public decimal? TotalAmount { get; set; }
		public DateTime? TransactionDate { get; set; }
	}
}

/// <summary>
/// JSON Schema для Mistral OCR strict mode.
/// </summary>
internal static class MistralReceiptSchema
{
	public static object Schema => new
	{
		type = "object",
		properties = new
		{
			merchantName = new { type = "string", description = "Name of the merchant/store" },
			totalAmount = new { type = "number", description = "Total amount on the receipt" },
			transactionDate = new { type = "string", format = "date", description = "Transaction date (YYYY-MM-DD)" },
			items = new
			{
				type = "array",
				items = new
				{
					type = "object",
					properties = new
					{
						name = new { type = "string" },
						quantity = new { type = "number" },
						price = new { type = "number" }
					}
				}
			}
		},
		required = new[] { "merchantName", "totalAmount" }
	};
}
