using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Registers OCR services with provider selection via typed <see cref="OcrOptions"/>.
/// Configuration is validated at startup — invalid config will block app start.
/// </summary>
public static class OcrRegistration
{
	public static IServiceCollection AddOcrServices(
		this IServiceCollection services,
		IConfiguration configuration)
	{
		// ── Bind + validate typed options ──
		services.AddOptions<OcrOptions>()
			.Bind(configuration.GetSection(OcrOptions.SectionName))
			.Validate(options =>
			{
				var provider = (options.Provider ?? "fallback").Trim().ToLowerInvariant();
				return provider switch
				{
					"azure" or "azuredocumentintelligence" => options.Azure.IsConfigured,
					"mistral" => options.Mistral.IsConfigured,
					"fallback" => true, // at least one provider should be available, but we allow degraded startup
					_ => false
				};
			}, "OCR provider configuration is invalid. " +
			   "Azure requires Endpoint + ApiKey. Mistral requires ApiKey. " +
			   "Accepted providers: azure, mistral, fallback.")
			.ValidateOnStart();

		// ── Read raw config for DI registration (options not yet built) ──
		var ocrSection = configuration.GetSection(OcrOptions.SectionName);
		var azureEndpoint = ocrSection["Azure:Endpoint"];
		var azureKey = ocrSection["Azure:ApiKey"];
		var isAzureConfigured = !string.IsNullOrWhiteSpace(azureEndpoint)
			&& !string.IsNullOrWhiteSpace(azureKey);

		// ── Azure DI client (always registered when configured — needed for fallback) ──
		if (isAzureConfigured)
		{
			services.AddSingleton(_ => new DocumentAnalysisClient(
				new Uri(azureEndpoint!),
				new AzureKeyCredential(azureKey!)));

			services.AddScoped<AzureDocumentIntelligenceOcrService>();
		}

		// ── Mistral HTTP client (always registered — used in fallback too) ──
		services.AddHttpClient<MistralOcrService>((sp, client) =>
		{
			var options = sp.GetRequiredService<IOptions<OcrOptions>>().Value;
			client.BaseAddress = new Uri(options.Mistral.BaseUrl);
			client.Timeout = TimeSpan.FromSeconds(options.Mistral.TimeoutSeconds);

			if (!string.IsNullOrEmpty(options.Mistral.ApiKey))
				client.DefaultRequestHeaders.Authorization = new("Bearer", options.Mistral.ApiKey);
		});

		// ── Select IOcrService implementation ──
		var provider = (ocrSection.GetValue<string>("Provider") ?? "fallback").Trim().ToLowerInvariant();

		switch (provider)
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
