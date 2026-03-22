using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Monobank;

/// <summary>
/// Stateless proxy до Monobank API. Токен ніколи не зберігається, не логується, не кешується.
/// </summary>
public class MonobankStatelessProxyService : IMonobankStatelessProxyService
{
	private readonly HttpClient _httpClient;
	private readonly ILogger<MonobankStatelessProxyService> _logger;

	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
	};

	public MonobankStatelessProxyService(
		HttpClient httpClient,
		ILogger<MonobankStatelessProxyService> logger)
	{
		_httpClient = httpClient;
		_logger = logger;
	}

	public async Task<ServiceResponse<MonobankClientInfoDto>> GetClientInfoAsync(
		string token, CancellationToken ct)
	{
		try
		{
			using var request = new HttpRequestMessage(HttpMethod.Get, "personal/client-info");
			request.Headers.Add("X-Token", token);

			var response = await _httpClient.SendAsync(request, ct);

			if (!response.IsSuccessStatusCode)
			{
				var statusCode = (int)response.StatusCode;
				_logger.LogWarning(
					"Monobank client-info returned {StatusCode}",
					statusCode);

				return statusCode == 401
					? ServiceResponse<MonobankClientInfoDto>.Failure("Невірний або протермінований токен Monobank")
					: ServiceResponse<MonobankClientInfoDto>.Failure($"Помилка Monobank API (HTTP {statusCode})");
			}

			var clientInfo = await response.Content.ReadFromJsonAsync<MonobankClientInfoResponse>(JsonOptions, ct);

			if (clientInfo is null)
				return ServiceResponse<MonobankClientInfoDto>.Failure("Порожня відповідь від Monobank API");

			var dto = new MonobankClientInfoDto(
				clientInfo.ClientId,
				clientInfo.Name,
				clientInfo.WebHookUrl,
				clientInfo.Accounts?.Select(a => new MonobankAccountDto(
					a.Id, a.SendId, a.Balance, a.CreditLimit,
					a.Type ?? "unknown", a.CurrencyCode, a.CashbackType, a.Iban)).ToList()
					?? [],
				clientInfo.Jars?.Select(j => new MonobankJarDto(
					j.Id, j.SendId, j.Title ?? "Без назви",
					j.Description, j.CurrencyCode, j.Balance, j.Goal)).ToList()
					?? []);

			return ServiceResponse<MonobankClientInfoDto>.Success(dto);
		}
		catch (TaskCanceledException)
		{
			_logger.LogWarning("Monobank client-info request timed out");
			return ServiceResponse<MonobankClientInfoDto>.Failure("Час очікування запиту до Monobank вичерпано");
		}
		catch (HttpRequestException ex)
		{
			_logger.LogWarning(ex, "Monobank client-info request failed");
			return ServiceResponse<MonobankClientInfoDto>.Failure("Помилка з'єднання з Monobank API");
		}
	}

	public async Task<ServiceResponse> RegisterWebhookAsync(
		string token, string webhookUrl, CancellationToken ct)
	{
		try
		{
			using var request = new HttpRequestMessage(HttpMethod.Post, "personal/webhook");
			request.Headers.Add("X-Token", token);
			request.Content = JsonContent.Create(new { webHookUrl = webhookUrl }, options: JsonOptions);

			var response = await _httpClient.SendAsync(request, ct);

			if (!response.IsSuccessStatusCode)
			{
				var statusCode = (int)response.StatusCode;
				_logger.LogWarning(
					"Monobank webhook registration returned {StatusCode}",
					statusCode);

				return statusCode == 401
					? ServiceResponse.Failure("Невірний або протермінований токен Monobank")
					: ServiceResponse.Failure($"Помилка реєстрації webhook (HTTP {statusCode})");
			}

			_logger.LogInformation("Monobank webhook registered successfully");
			return ServiceResponse.Success("Webhook зареєстровано");
		}
		catch (TaskCanceledException)
		{
			_logger.LogWarning("Monobank webhook registration timed out");
			return ServiceResponse.Failure("Час очікування реєстрації webhook вичерпано");
		}
		catch (HttpRequestException ex)
		{
			_logger.LogWarning(ex, "Monobank webhook registration failed");
			return ServiceResponse.Failure("Помилка з'єднання з Monobank API");
		}
	}

	// ── Internal DTOs for deserialization ──

	private record MonobankClientInfoResponse
	{
		public string? ClientId { get; init; }
		public string? Name { get; init; }
		public string? WebHookUrl { get; init; }
		public List<MonobankAccountResponse>? Accounts { get; init; }
		public List<MonobankJarResponse>? Jars { get; init; }
	}

	private record MonobankAccountResponse
	{
		public string Id { get; init; } = string.Empty;
		public string? SendId { get; init; }
		public long Balance { get; init; }
		public long CreditLimit { get; init; }
		public string? Type { get; init; }
		public int CurrencyCode { get; init; }
		public string? CashbackType { get; init; }
		public string? Iban { get; init; }
	}

	private record MonobankJarResponse
	{
		public string Id { get; init; } = string.Empty;
		public string? SendId { get; init; }
		public string? Title { get; init; }
		public string? Description { get; init; }
		public int CurrencyCode { get; init; }
		public long Balance { get; init; }
		public long? Goal { get; init; }
	}
}
