using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Contracts.Email;

namespace ProzoroBanka.Infrastructure.Services.Email;

public sealed class ResendEmailNotificationService : IEmailNotificationService
{
	private const string DefaultBaseUrl = "https://api.resend.com/";
	private readonly HttpClient _httpClient;
	private readonly IConfiguration _configuration;
	private readonly ILogger<ResendEmailNotificationService> _logger;

	public ResendEmailNotificationService(
		HttpClient httpClient,
		IConfiguration configuration,
		ILogger<ResendEmailNotificationService> logger)
	{
		_httpClient = httpClient;
		_configuration = configuration;
		_logger = logger;
	}

	public async Task SendEmailAsync(ISendEmailCommand command, CancellationToken cancellationToken = default)
	{
		var apiKey = _configuration["Email:Resend:ApiKey"];
		if (string.IsNullOrWhiteSpace(apiKey))
		{
			_logger.LogWarning(
				"Email provider is set to Resend but ApiKey is missing. Logging email instead. To={To}, Subject={Subject}, CorrelationId={CorrelationId}, Body={Body}",
				command.To,
				command.Subject,
				command.CorrelationId,
				command.Body);
			return;
		}

		var fromAddress = command.From ?? _configuration["Email:FromAddress"] ?? "onboarding@resend.dev";

		var payload = new ResendEmailRequest(
			fromAddress,
			[command.To],
			command.Subject,
			command.IsHtml ? command.Body : null,
			command.IsHtml ? null : command.Body,
			command.Cc?.ToArray(),
			command.Bcc?.ToArray(),
			(command.Attachments ?? [])
				.Select(a => new ResendAttachment(a.FileName, Convert.ToBase64String(a.Content), a.ContentType))
				.ToArray());

		using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
		{
			Content = JsonContent.Create(payload)
		};

		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

		using var response = await _httpClient.SendAsync(request, cancellationToken);
		if (response.IsSuccessStatusCode)
		{
			return;
		}

		var details = await response.Content.ReadAsStringAsync(cancellationToken);
		_logger.LogError(
			"Failed to send email via Resend. StatusCode={StatusCode}, To={To}, Subject={Subject}, CorrelationId={CorrelationId}, Response={Response}",
			(int)response.StatusCode,
			command.To,
			command.Subject,
			command.CorrelationId,
			details);

		throw new HttpRequestException($"Resend request failed with status {(int)response.StatusCode}.");
	}

	public Task SendTemplatedEmailAsync(string templateName, string to, object templateData, CancellationToken cancellationToken = default)
	{
		var command = new EmailMessage(
			to,
			$"{templateName} notification",
			JsonSerializer.Serialize(templateData, new JsonSerializerOptions { WriteIndented = true }),
			false,
			CorrelationId: templateName);

		return SendEmailAsync(command, cancellationToken);
	}

	public async Task ScheduleEmailAsync(ISendEmailCommand command, DateTime scheduledTime, CancellationToken cancellationToken = default)
	{
		var delay = scheduledTime.ToUniversalTime() - DateTime.UtcNow;
		if (delay > TimeSpan.Zero)
		{
			await Task.Delay(delay, cancellationToken);
		}

		await SendEmailAsync(command, cancellationToken);
	}

	internal static Uri BuildBaseUri(string? configuredBaseUrl)
	{
		if (Uri.TryCreate(configuredBaseUrl, UriKind.Absolute, out var baseUri))
		{
			return baseUri;
		}

		return new Uri(DefaultBaseUrl);
	}

	private sealed record ResendEmailRequest(
		string From,
		IReadOnlyList<string> To,
		string Subject,
		string? Html,
		string? Text,
		IReadOnlyList<string>? Cc,
		IReadOnlyList<string>? Bcc,
		IReadOnlyList<ResendAttachment>? Attachments);

	private sealed record ResendAttachment(string Filename, string Content, string ContentType);

	private sealed record EmailMessage(
		string To,
		string Subject,
		string Body,
		bool IsHtml,
		string? From = null,
		IEnumerable<string>? Cc = null,
		IEnumerable<string>? Bcc = null,
		IEnumerable<IEmailAttachment>? Attachments = null,
		string? CorrelationId = null) : ISendEmailCommand
	{
		public Guid MessageId { get; } = Guid.NewGuid();
		public DateTime RequestedAt { get; } = DateTime.UtcNow;
	}
}