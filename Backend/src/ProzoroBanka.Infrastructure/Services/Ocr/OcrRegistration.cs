using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using Polly;
using Polly.Extensions.Http;
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

		// ── Mistral HTTP client (Receipts) ──
		services.AddHttpClient<MistralOcrService>((sp, client) =>
		{
			var options = sp.GetRequiredService<IOptions<OcrOptions>>().Value;
			client.BaseAddress = new Uri(options.Mistral.BaseUrl);
			client.Timeout = TimeSpan.FromSeconds(options.Mistral.TimeoutSeconds);

			if (!string.IsNullOrEmpty(options.Mistral.ApiKey))
				client.DefaultRequestHeaders.Authorization = new("Bearer", options.Mistral.ApiKey);
		})
		.AddPolicyHandler(GetRetryPolicy());

		// ── Mistral HTTP client (Purchase Documents) ──
		if (configuration.GetValue<bool?>("Ocr:UseExtractionStub") ?? true)
		{
			services.AddScoped<IDocumentOcrService, StubDocumentOcrService>();
		}
		else
		{
			services.AddHttpClient<IDocumentOcrService, MistralPurchaseDocumentOcrService>((sp, client) =>
			{
				var options = sp.GetRequiredService<IOptions<OcrOptions>>().Value;
				client.BaseAddress = new Uri(options.Mistral.BaseUrl);
				client.Timeout = TimeSpan.FromSeconds(options.Mistral.TimeoutSeconds);

				if (!string.IsNullOrEmpty(options.Mistral.ApiKey))
					client.DefaultRequestHeaders.Authorization = new("Bearer", options.Mistral.ApiKey);
			})
			.AddPolicyHandler(GetRetryPolicy());
		}

		// ── OpenRouter HTTP client ──
		services.AddHttpClient<OpenRouterOcrService>((sp, client) =>
		{
			var options = sp.GetRequiredService<IOptions<OcrOptions>>().Value;
			client.BaseAddress = new Uri(options.OpenRouter.BaseUrl);
			client.Timeout = TimeSpan.FromSeconds(options.OpenRouter.TimeoutSeconds);
			client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

			if (!string.IsNullOrEmpty(options.OpenRouter.ApiKey))
				client.DefaultRequestHeaders.Authorization = new("Bearer", options.OpenRouter.ApiKey);
		})
		.AddPolicyHandler(GetRetryPolicy());

		// ── Factory Registration ──
		services.AddScoped<IOcrServiceFactory, OcrServiceFactory>();

		// ── Background OCR Queue ──
		services.AddSingleton<OcrProcessingQueue>();
		services.AddSingleton<IOcrProcessingQueue>(sp => sp.GetRequiredService<OcrProcessingQueue>());
		services.AddHostedService<OcrBackgroundWorker>();

		return services;
	}

	/// <summary>
	/// Polly retry policy: retries on transient HTTP errors (5xx, 408) and HTTP 429 (Too Many Requests).
	/// Exponential backoff with jitter: ~2s, ~4s, ~8s.
	/// </summary>
	private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
	{
		return HttpPolicyExtensions
			.HandleTransientHttpError()
			.OrResult(response => (int)response.StatusCode == 429)
			.WaitAndRetryAsync(3, attempt =>
				TimeSpan.FromSeconds(Math.Pow(2, attempt))
				+ TimeSpan.FromMilliseconds(Random.Shared.Next(0, 500)));
	}
}
