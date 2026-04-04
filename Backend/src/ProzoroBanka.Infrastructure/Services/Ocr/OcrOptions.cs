namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Typed options for the OCR subsystem, bound from appsettings "Ocr" section.
/// </summary>
public class OcrOptions
{
	public const string SectionName = "Ocr";

	/// <summary>
	/// If true, the extraction pipeline uses a deterministic stub instead of real providers.
	/// Useful for local dev and integration tests.
	/// </summary>
	public bool UseExtractionStub { get; set; } = true;

	/// <summary>
	/// Active OCR provider: "azure", "mistral", or "fallback" (default).
	/// Case-insensitive.
	/// </summary>
	public string Provider { get; set; } = "fallback";

	/// <summary>
	/// Azure Document Intelligence configuration.
	/// </summary>
	public AzureOcrOptions Azure { get; set; } = new();

	/// <summary>
	/// Mistral OCR API configuration.
	/// </summary>
	public MistralOcrOptions Mistral { get; set; } = new();
}

public class AzureOcrOptions
{
	public string Endpoint { get; set; } = string.Empty;
	public string ApiKey { get; set; } = string.Empty;
	public string ModelId { get; set; } = "prebuilt-receipt";
	public int TimeoutSeconds { get; set; } = 30;

	public bool IsConfigured =>
		!string.IsNullOrWhiteSpace(Endpoint)
		&& !string.IsNullOrWhiteSpace(ApiKey);
}

public class MistralOcrOptions
{
	public string ApiKey { get; set; } = string.Empty;
	public string BaseUrl { get; set; } = "https://api.mistral.ai";
	public string ModelId { get; set; } = "mistral-ocr-latest";
	public int TimeoutSeconds { get; set; } = 60;

	public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
