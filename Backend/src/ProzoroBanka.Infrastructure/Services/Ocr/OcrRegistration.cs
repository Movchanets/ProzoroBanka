using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// Registers OCR services and Factory.
/// Configuration is validated at startup.
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
				if (options.UseExtractionStub) return true;
				return options.Mistral.IsConfigured || options.OpenRouter.IsConfigured;
			}, "OCR configuration must have at least one valid provider (Mistral or OpenRouter) if UseExtractionStub is false.")
			.ValidateOnStart();

		// ── Mistral HTTP client ──
		services.AddHttpClient<MistralOcrService>((sp, client) =>
		{
			var options = sp.GetRequiredService<IOptions<OcrOptions>>().Value;
			client.BaseAddress = new Uri(options.Mistral.BaseUrl);
			client.Timeout = TimeSpan.FromSeconds(options.Mistral.TimeoutSeconds);

			if (!string.IsNullOrEmpty(options.Mistral.ApiKey))
				client.DefaultRequestHeaders.Authorization = new("Bearer", options.Mistral.ApiKey);
		});

		// ── OpenRouter HTTP client ──
		services.AddHttpClient<OpenRouterOcrService>((sp, client) =>
		{
			var options = sp.GetRequiredService<IOptions<OcrOptions>>().Value;
			client.BaseAddress = new Uri(options.OpenRouter.BaseUrl);
			client.Timeout = TimeSpan.FromSeconds(options.OpenRouter.TimeoutSeconds);

			if (!string.IsNullOrEmpty(options.OpenRouter.ApiKey))
				client.DefaultRequestHeaders.Authorization = new("Bearer", options.OpenRouter.ApiKey);
		});

		// ── Factory Registration ──
		services.AddScoped<IOcrServiceFactory, OcrServiceFactory>();

		return services;
	}
}
