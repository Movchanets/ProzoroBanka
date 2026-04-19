using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

public class MistralPurchaseDocumentOcrService : IDocumentOcrService
{
	private static readonly SemaphoreSlim _concurrencyLimiter = new(2, 2);
	private readonly HttpClient _httpClient;
	private readonly ILogger<MistralPurchaseDocumentOcrService> _logger;

	public MistralPurchaseDocumentOcrService(HttpClient httpClient, ILogger<MistralPurchaseDocumentOcrService> logger)
	{
		_httpClient = httpClient;
		_logger = logger;
	}

	public async Task<DocumentOcrResult> ParseDocumentAsync(Stream imageStream, string fileName, DocumentType type, string? modelIdentifier = null, CancellationToken ct = default)
	{
		var model = !string.IsNullOrWhiteSpace(modelIdentifier) ? modelIdentifier : "mistral-ocr-latest";

		await _concurrencyLimiter.WaitAsync(ct);
		try
		{
			_logger.LogInformation("Mistral Document OCR: parsing {FileName} of type {Type} with model {Model}", fileName, type, model);

			using var ms = new MemoryStream();
			await imageStream.CopyToAsync(ms, ct);

            var fileBytes = ms.ToArray();
            
            // Extract raw PDF if wrapped in PKCS#7 signature (.p7s)
            var mimeType = GetMimeType(fileName);
            var isPdf = mimeType == "application/pdf";
            
            if (isPdf)
            {
                fileBytes = ExtractPdfFromPkcs7IfNeeded(fileBytes);
            }

			var base64 = Convert.ToBase64String(fileBytes);
			var dataUrl = $"data:{mimeType};base64,{base64}";

            // Select schema based on document type for better Mistral hints
            object schemaObj = type switch
            {
                DocumentType.BankReceipt => DocumentSchemas.BankReceiptSchema,
                DocumentType.Waybill => DocumentSchemas.WaybillSchema,
                DocumentType.Invoice => DocumentSchemas.InvoiceSchema,
                _ => DocumentSchemas.GenericDocumentSchema
            };

           
            var documentPayload = isPdf
                ? new Dictionary<string, string> { { "type", "document_url" }, { "document_url", dataUrl } }
                : new Dictionary<string, string> { { "type", "image_url" }, { "image_url", dataUrl } };

			var request = new
			{
				model = model,
				document = documentPayload,
				document_annotation_format = new
				{
					type = "json_schema",
					json_schema = schemaObj
				}
			};

			var response = await _httpClient.PostAsJsonAsync("/v1/ocr", request, ct);
			var responseBody = await response.Content.ReadAsStringAsync(ct);

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning(
					"Mistral Document OCR returned HTTP {StatusCode} for {FileName}. Body: {Body}",
					(int)response.StatusCode,
					fileName,
					Truncate(responseBody));
				return Failure($"Mistral API Error HTTP {(int)response.StatusCode}: {Truncate(responseBody)}");
			}

			_logger.LogDebug("Mistral Document OCR response body for {FileName}: {Body}", fileName, Truncate(responseBody, 2000));

			if (!TryExtractStructuredPayload(responseBody, out var rawContent, out var source, out var diagnostic))
			{
				_logger.LogWarning(
					"Mistral OCR response for {FileName} has no structured JSON in supported fields (document_annotation/markdown). Diagnostic: {Diagnostic}",
					fileName,
					diagnostic);
				return Failure("No structured JSON found in Mistral OCR response");
			}

			_logger.LogInformation("Mistral Document OCR extracted structured payload for {FileName} from {Source}", fileName, source);
			_logger.LogDebug("Mistral Document OCR structured payload for {FileName}: {Payload}", fileName, Truncate(rawContent, 2000));

			return ParseJsonResult(rawContent, type);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Mistral Document OCR failed for {FileName}", fileName);
			return Failure(ex.Message);
		}
		finally
		{
			_concurrencyLimiter.Release();
		}
	}

	private DocumentOcrResult ParseJsonResult(string content, DocumentType type)
	{
		try
		{
			var json = ExtractJson(content);
			if (json is null) return Failure("No JSON payload found.");

			using var doc = JsonDocument.Parse(json);
			var root = doc.RootElement;

			var counterparty = GetString(root, "counterparty_name") ?? GetString(root, "supplier_name") ?? GetString(root, "receiver_name");
			var dateStr = GetString(root, "date") ?? GetString(root, "document_date");
			var amount = GetDecimal(root, "total_amount") ?? GetDecimal(root, "amount");
			var edrpou = GetString(root, "edrpou") ?? GetString(root, "receiver_edrpou");
			var payerFullName = GetString(root, "payer_full_name") ?? GetString(root, "payer_name") ?? GetString(root, "sender_name");
			var receiptCode = GetString(root, "receipt_code") ?? GetString(root, "receipt_number") ?? GetString(root, "transaction_id");
			var paymentPurpose = GetString(root, "payment_purpose") ?? GetString(root, "purpose");
			var senderIban = GetString(root, "sender_iban") ?? GetString(root, "payer_iban");
			var receiverIban = GetString(root, "receiver_iban") ?? GetString(root, "iban");

			DateTime? documentDate = null;
			if (!string.IsNullOrWhiteSpace(dateStr) && DateTime.TryParse(dateStr, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dt))
			{
				documentDate = dt;
			}
            else if (!string.IsNullOrWhiteSpace(dateStr) && DateTime.TryParseExact(dateStr, new[] { "yyyy-MM-dd", "dd.MM.yyyy", "dd-MM-yyyy" }, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dtExact))
            {
                documentDate = dtExact;
            }

			var itemsList = new List<OcrParsedItem>();
			if (root.TryGetProperty("items", out var itemsEl) && itemsEl.ValueKind == JsonValueKind.Array)
			{
			    foreach(var itemEl in itemsEl.EnumerateArray())
			    {
			        var name = GetString(itemEl, "name") ?? "Невідомий товар";
			        var qty = GetDecimal(itemEl, "quantity") ?? 1m;
			        var totalPrice = GetDecimal(itemEl, "total_price") ?? 0m;
			        var unitPrice = GetDecimal(itemEl, "unit_price") ?? (qty > 0 ? totalPrice / qty : 0m);
			        itemsList.Add(new OcrParsedItem(name, qty, unitPrice, totalPrice));
			    }
			}

            _logger.LogInformation("Parsed document type {Type}. DateStr: {DateStr}, DateParsed: {DocumentDate}, Counterparty: {Counterparty}, Amount: {Amount}, Items: {ItemCount}", type, dateStr, documentDate, counterparty, amount, itemsList.Count);

			return new DocumentOcrResult(
				Success: true,
				CounterpartyName: counterparty,
				DocumentDate: documentDate,
				TotalAmount: amount,
				Items: itemsList,
				RawJson: json,
				ErrorMessage: null,
				Edrpou: edrpou,
				PayerFullName: payerFullName,
				ReceiptCode: receiptCode,
				PaymentPurpose: paymentPurpose,
				SenderIban: senderIban,
				ReceiverIban: receiverIban
			);
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Failed to parse document JSON content");
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

		if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var num))
			return num;

		if (value.ValueKind == JsonValueKind.String &&
			decimal.TryParse(value.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
			return parsed;

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

	private static DocumentOcrResult Failure(string error) =>
		new(false, null, null, null, Array.Empty<OcrParsedItem>(), null, error);

	private static string Truncate(string value, int maxLength = 600)
	{
		if (string.IsNullOrWhiteSpace(value)) return "<empty>";
		return value.Length <= maxLength ? value : $"{value[..maxLength]}...";
	}

    private static byte[] ExtractPdfFromPkcs7IfNeeded(byte[] fileBytes)
    {
        // CMS/PKCS#7 wrapped PDFs (especially Ukrainian DSTU signatures) often fail with 
        // standard SignedCms due to unsupported cryptographic algorithms.
        // We can manually scan for the PDF header and footer.
        
        var pdfHeader = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D }; // %PDF-
        var eofMarker = new byte[] { 0x25, 0x25, 0x45, 0x4F, 0x46 }; // %%EOF

        int startIndex = -1;
        for (int i = 0; i < fileBytes.Length - pdfHeader.Length; i++)
        {
            if (fileBytes[i] == pdfHeader[0] &&
                fileBytes[i + 1] == pdfHeader[1] &&
                fileBytes[i + 2] == pdfHeader[2] &&
                fileBytes[i + 3] == pdfHeader[3] &&
                fileBytes[i + 4] == pdfHeader[4])
            {
                startIndex = i;
                break;
            }
        }

        if (startIndex > 0) // if 0, it's already a raw PDF
        {
            // Find last %%EOF
            int endIndex = -1;
            for (int i = fileBytes.Length - eofMarker.Length; i >= startIndex; i--)
            {
                if (fileBytes[i] == eofMarker[0] &&
                    fileBytes[i + 1] == eofMarker[1] &&
                    fileBytes[i + 2] == eofMarker[2] &&
                    fileBytes[i + 3] == eofMarker[3] &&
                    fileBytes[i + 4] == eofMarker[4])
                {
                    endIndex = i + eofMarker.Length;
                    // Include trailing \r\n if present
                    while (endIndex < fileBytes.Length && (fileBytes[endIndex] == '\r' || fileBytes[endIndex] == '\n'))
                    {
                        endIndex++;
                    }
                    break;
                }
            }

            if (endIndex == -1)
            {
                // Fallback to taking everything if EOF not found, though rare
                endIndex = fileBytes.Length;
            }

            var pdfBytes = new byte[endIndex - startIndex];
            Array.Copy(fileBytes, startIndex, pdfBytes, 0, pdfBytes.Length);
            return pdfBytes;
        }

        return fileBytes;
    }
}

internal static class DocumentSchemas
{
	public static object BankReceiptSchema => new
	{
		name = "bank_receipt_schema",
		schema = new
		{
			type = "object",
			properties = new
			{
				date = new { type = "string", description = "Дата транзакції СУВОРО у форматі YYYY-MM-DD" },
				receiver_name = new { type = "string", description = "Отримувач коштів / ПІБ або назва організації" },
				payer_full_name = new { type = "string", description = "ПІБ або назва платника" },
				edrpou = new { type = "string", description = "ЄДРПОУ отримувача або контрагента, якщо вказано" },
				receipt_code = new { type = "string", description = "Код/номер квитанції або ідентифікатор платежу" },
				total_amount = new { type = "number", description = "Сума платежу" },
				payment_purpose = new { type = "string", description = "Призначення платежу" },
				sender_iban = new { type = "string", description = "IBAN відправника" },
				receiver_iban = new { type = "string", description = "IBAN отримувача" }
			},
			required = new[] { "date", "receiver_name", "total_amount" },
			additionalProperties = false
		},
		strict = true
	};

    public static object WaybillSchema => new
	{
		name = "waybill_schema",
		schema = new
		{
			type = "object",
			properties = new
			{
				date = new { type = "string", description = "Дата накладної СУВОРО у форматі YYYY-MM-DD" },
				supplier_name = new { type = "string", description = "Постачальник або продавець" },
				total_amount = new { type = "number", description = "Разом до сплати (загальна сума накладної)" },
				items = new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new
                        {
                            name = new { type = "string", description = "Назва товару" },
                            quantity = new { type = "number", description = "Кількість" },
                            total_price = new { type = "number", description = "Сума за товар" }
                        },
                        required = new[] { "name", "total_price" },
			            additionalProperties = false
                    }
                }
			},
			required = new[] { "date", "supplier_name", "total_amount" },
			additionalProperties = false
		},
		strict = true
	};

    public static object InvoiceSchema => new
	{
		name = "invoice_schema",
		schema = new
		{
			type = "object",
			properties = new
			{
				date = new { type = "string", description = "Дата рахунку СУВОРО у форматі YYYY-MM-DD" },
				supplier_name = new { type = "string", description = "Постачальник або отримувач платежу" },
				total_amount = new { type = "number", description = "Загальна сума до сплати" },
			},
			required = new[] { "date", "supplier_name", "total_amount" },
			additionalProperties = false
		},
		strict = true
	};

    public static object GenericDocumentSchema => new
	{
		name = "generic_document_schema",
		schema = new
		{
			type = "object",
			properties = new
			{
				date = new { type = "string", description = "Дата документа СУВОРО у форматі YYYY-MM-DD, якщо знайдено" },
				counterparty_name = new { type = "string", description = "Контрагент (постачальник/надавач/отримувач), якщо знайдено" },
				amount = new { type = "number", description = "Сума вказана у документі, якщо знайдено" },
			},
			required = new string[] {},
			additionalProperties = false
		},
		strict = true
	};
}
