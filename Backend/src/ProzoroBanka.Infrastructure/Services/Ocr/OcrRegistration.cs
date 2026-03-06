using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Реєстрація OCR-сервісів з вибором провайдера через appsettings:Ocr:Provider.
/// </summary>
public static class OcrRegistration
{
	public static IServiceCollection AddOcrServices(
		this IServiceCollection services,
		IConfiguration configuration)
	{
		var ocrSection = configuration.GetSection("Ocr");
		var provider = ocrSection.GetValue<string>("Provider") ?? "fallback";
		var normalizedProvider = provider.Trim().ToLowerInvariant();

		// Реєструємо Azure DI клієнт (завжди, бо потрібен для fallback)
		var azureSection = ocrSection.GetSection("Azure");
		var azureEndpoint = azureSection["Endpoint"];
		var azureKey = azureSection["ApiKey"];

		var isAzureConfigured = !string.IsNullOrWhiteSpace(azureEndpoint)
			&& !string.IsNullOrWhiteSpace(azureKey);

		if (isAzureConfigured)
		{
			services.AddSingleton(_ => new DocumentAnalysisClient(
				new Uri(azureEndpoint!),
				new AzureKeyCredential(azureKey!)));

			services.AddScoped<AzureDocumentIntelligenceOcrService>();
		}

		// Реєструємо Mistral HTTP клієнт
		var mistralSection = ocrSection.GetSection("Mistral");
		var mistralApiKey = mistralSection["ApiKey"];
		var mistralBaseUrl = mistralSection["BaseUrl"] ?? "https://api.mistral.ai";

		services.AddHttpClient<MistralOcrService>(client =>
		{
			client.BaseAddress = new Uri(mistralBaseUrl);
			if (!string.IsNullOrEmpty(mistralApiKey))
				client.DefaultRequestHeaders.Authorization = new("Bearer", mistralApiKey);
		});

		// Обираємо що реєструвати як IOcrService
		switch (normalizedProvider)
		{
			case "azure":
			case "azuredocumentintelligence":
				services.AddScoped<IOcrService>(sp =>
					isAzureConfigured
						? sp.GetRequiredService<AzureDocumentIntelligenceOcrService>()
						: sp.GetRequiredService<FallbackOcrService>());
				break;

			case "mistral":
				services.AddScoped<IOcrService>(sp =>
					sp.GetRequiredService<MistralOcrService>());
				break;

			case "fallback":
			default:
				services.AddScoped<IOcrService>(sp =>
					sp.GetRequiredService<FallbackOcrService>());
				break;
		}

		services.AddScoped<FallbackOcrService>();

		return services;
	}
}
