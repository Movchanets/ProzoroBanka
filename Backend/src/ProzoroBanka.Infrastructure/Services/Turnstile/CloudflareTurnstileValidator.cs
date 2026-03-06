using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Turnstile;

/// <summary>
/// Валідатор Cloudflare Turnstile CAPTCHA токена.
/// </summary>
public class TurnstileService : ITurnstileService
{
	private readonly HttpClient _httpClient;
	private readonly string? _secretKey;
	private readonly string _verifyUrl;
	private readonly ILogger<TurnstileService> _logger;

	public TurnstileService(
		HttpClient httpClient,
		IConfiguration configuration,
		ILogger<TurnstileService> logger)
	{
		_httpClient = httpClient;
		_secretKey = configuration["Turnstile:SecretKey"];
		_verifyUrl = configuration["Turnstile:VerifyUrl"]
			?? "https://challenges.cloudflare.com/turnstile/v0/siteverify";
		_logger = logger;
	}

	public async Task<bool> ValidateAsync(string token, string? remoteIp = null, CancellationToken ct = default)
	{
		if (string.IsNullOrWhiteSpace(token))
		{
			_logger.LogWarning("Turnstile validation skipped because token is missing.");
			return false;
		}

		if (string.IsNullOrWhiteSpace(_secretKey))
		{
			_logger.LogWarning("Turnstile secret is not configured. Failing validation for safety.");
			return false;
		}

		try
		{
			var payload = new Dictionary<string, string>
			{
				["secret"] = _secretKey,
				["response"] = token
			};

			if (!string.IsNullOrEmpty(remoteIp))
				payload["remoteip"] = remoteIp;

			var response = await _httpClient.PostAsync(
				_verifyUrl,
				new FormUrlEncodedContent(payload),
				ct);

			if (!response.IsSuccessStatusCode)
			{
				_logger.LogWarning("Turnstile verification returned HTTP {StatusCode}", response.StatusCode);
				return false;
			}

			var result = await response.Content.ReadFromJsonAsync<TurnstileResponse>(cancellationToken: ct);
			if (result is null)
			{
				_logger.LogWarning("Turnstile verification returned an empty response.");
				return false;
			}

			if (result.Success)
			{
				_logger.LogDebug("Turnstile validation succeeded for hostname {Hostname}", result.Hostname);
				return true;
			}

			_logger.LogWarning("Turnstile validation failed. Errors: {Errors}",
				result.ErrorCodes != null ? string.Join(", ", result.ErrorCodes) : "unknown");

			return false;
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Turnstile validation error");
			return false;
		}
	}

	private class TurnstileResponse
	{
		[JsonPropertyName("success")]
		public bool Success { get; set; }

		[JsonPropertyName("challenge_ts")]
		public string? ChallengeTs { get; set; }

		[JsonPropertyName("hostname")]
		public string? Hostname { get; set; }

		[JsonPropertyName("error-codes")]
		public string[]? ErrorCodes { get; set; }
	}
}
