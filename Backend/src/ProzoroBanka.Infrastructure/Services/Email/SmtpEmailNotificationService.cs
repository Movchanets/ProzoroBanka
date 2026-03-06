using System.Net;
using System.Net.Mail;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Contracts.Email;

namespace ProzoroBanka.Infrastructure.Services.Email;

public sealed class SmtpEmailNotificationService : IEmailNotificationService
{
	private readonly IConfiguration _configuration;
	private readonly ILogger<SmtpEmailNotificationService> _logger;

	public SmtpEmailNotificationService(
		IConfiguration configuration,
		ILogger<SmtpEmailNotificationService> logger)
	{
		_configuration = configuration;
		_logger = logger;
	}

	public async Task SendEmailAsync(ISendEmailCommand command, CancellationToken cancellationToken = default)
	{
		var smtp = _configuration.GetSection("Email:Smtp");
		var host = smtp["Host"];

		if (string.IsNullOrWhiteSpace(host))
		{
			_logger.LogWarning(
				"Email SMTP is not configured. Logging email instead. To={To}, Subject={Subject}, CorrelationId={CorrelationId}, Body={Body}",
				command.To,
				command.Subject,
				command.CorrelationId,
				command.Body);
			return;
		}

		using var message = new MailMessage
		{
			Subject = command.Subject,
			Body = command.Body,
			IsBodyHtml = command.IsHtml,
			From = new MailAddress(
				command.From ?? _configuration["Email:FromAddress"] ?? "noreply@prozoro.local",
				_configuration["Email:FromName"] ?? "ProzoroBanka")
		};

		message.To.Add(command.To);

		foreach (var recipient in command.Cc ?? [])
			message.CC.Add(recipient);

		foreach (var recipient in command.Bcc ?? [])
			message.Bcc.Add(recipient);

		foreach (var attachment in command.Attachments ?? [])
		{
			message.Attachments.Add(new Attachment(
				new MemoryStream(attachment.Content),
				attachment.FileName,
				attachment.ContentType));
		}

		using var client = new SmtpClient(host, smtp.GetValue("Port", 25))
		{
			EnableSsl = smtp.GetValue("EnableSsl", true)
		};

		var username = smtp["Username"];
		var password = smtp["Password"];

		if (!string.IsNullOrWhiteSpace(username))
		{
			client.Credentials = new NetworkCredential(username, password);
		}

		await client.SendMailAsync(message, cancellationToken);
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
			await Task.Delay(delay, cancellationToken);

		await SendEmailAsync(command, cancellationToken);
	}

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