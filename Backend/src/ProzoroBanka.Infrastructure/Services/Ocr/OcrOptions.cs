namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Typed options for the OCR subsystem, bound from appsettings "Ocr" section.
/// </summary>
public class OcrOptions
{
	public const string SectionName = "Ocr";

	/// <summary>
	/// If true, the extraction pipeline uses a deterministic stub instead of real providers.
	/// </summary>
	public bool UseExtractionStub { get; set; } = true;

	/// <summary>
	/// Mistral native OCR API (/v1/ocr) configuration.
	/// </summary>
	public MistralOcrOptions Mistral { get; set; } = new();

	/// <summary>
	/// OpenRouter API (/v1/chat/completions, OpenAI-compatible) configuration.
	/// </summary>
	public OpenRouterOcrOptions OpenRouter { get; set; } = new();
}

public class MistralOcrOptions
{
	public string ApiKey { get; set; } = string.Empty;
	public string BaseUrl { get; set; } = "https://api.mistral.ai";
	public int TimeoutSeconds { get; set; } = 60;

	public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}

public class OpenRouterOcrOptions
{
	public string ApiKey { get; set; } = string.Empty;
	public string BaseUrl { get; set; } = "https://openrouter.ai/api";
	public int TimeoutSeconds { get; set; } = 60;

	public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
