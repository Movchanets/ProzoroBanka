using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ProzoroBanka.Application.Contracts.Email;
using ProzoroBanka.Infrastructure.Services.Email;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Email;

public class ResendEmailNotificationServiceTests
{
	[Fact]
	public async Task SendEmailAsync_WhenHtmlMessage_SendsResendRequestWithBearerToken()
	{
		CapturedRequestData? capturedRequest = null;
		var handler = new StubHttpMessageHandler(async request =>
		{
			capturedRequest = new CapturedRequestData(
				request.Method,
				request.RequestUri?.ToString(),
				request.Headers.Authorization?.Scheme,
				request.Headers.Authorization?.Parameter,
				request.Content is null
					? null
					: await request.Content.ReadAsStringAsync(CancellationToken.None));
			return new HttpResponseMessage(HttpStatusCode.OK);
		});

		using var httpClient = new HttpClient(handler)
		{
			BaseAddress = new Uri("https://api.resend.com/")
		};

		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Email:Resend:ApiKey"] = "re_test_token",
			["Email:FromAddress"] = "noreply@prozoro.local"
		});

		var sut = new ResendEmailNotificationService(httpClient, config, NullLogger<ResendEmailNotificationService>.Instance);
		var command = new TestEmailCommand(
			To: "user@example.com",
			Subject: "Welcome",
			Body: "<strong>it works</strong>",
			IsHtml: true,
			From: null,
			Cc: ["cc@example.com"],
			Bcc: ["bcc@example.com"],
			Attachments: [new TestAttachment("file.txt", "text/plain", Encoding.UTF8.GetBytes("abc"))]);

		await sut.SendEmailAsync(command, CancellationToken.None);

		Assert.NotNull(capturedRequest);
		Assert.Equal(HttpMethod.Post, capturedRequest!.Method);
		Assert.Equal("https://api.resend.com/emails", capturedRequest.RequestUri);
		Assert.Equal("Bearer", capturedRequest.AuthorizationScheme);
		Assert.Equal("re_test_token", capturedRequest.AuthorizationParameter);

		var payloadJson = capturedRequest.Body!;
		using var payload = JsonDocument.Parse(payloadJson);
		var root = payload.RootElement;

		Assert.Equal("noreply@prozoro.local", root.GetProperty("from").GetString());
		Assert.Equal("Welcome", root.GetProperty("subject").GetString());
		Assert.Equal("<strong>it works</strong>", root.GetProperty("html").GetString());
		Assert.Equal("user@example.com", root.GetProperty("to")[0].GetString());
		Assert.Equal("cc@example.com", root.GetProperty("cc")[0].GetString());
		Assert.Equal("bcc@example.com", root.GetProperty("bcc")[0].GetString());
		Assert.Equal("file.txt", root.GetProperty("attachments")[0].GetProperty("filename").GetString());
	}

	[Fact]
	public async Task SendEmailAsync_WhenTextMessage_SetsTextPayload()
	{
		CapturedRequestData? capturedRequest = null;
		var handler = new StubHttpMessageHandler(async request =>
		{
			capturedRequest = new CapturedRequestData(
				request.Method,
				request.RequestUri?.ToString(),
				request.Headers.Authorization?.Scheme,
				request.Headers.Authorization?.Parameter,
				request.Content is null
					? null
					: await request.Content.ReadAsStringAsync(CancellationToken.None));
			return new HttpResponseMessage(HttpStatusCode.OK);
		});

		using var httpClient = new HttpClient(handler)
		{
			BaseAddress = new Uri("https://api.resend.com/")
		};

		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Email:Resend:ApiKey"] = "re_test_token",
			["Email:FromAddress"] = "noreply@prozoro.local"
		});

		var sut = new ResendEmailNotificationService(httpClient, config, NullLogger<ResendEmailNotificationService>.Instance);
		var command = new TestEmailCommand(
			To: "user@example.com",
			Subject: "Text",
			Body: "plain body",
			IsHtml: false,
			From: null,
			Cc: null,
			Bcc: null,
			Attachments: null);

		await sut.SendEmailAsync(command, CancellationToken.None);

		Assert.NotNull(capturedRequest);
		var payloadJson = capturedRequest!.Body!;
		using var payload = JsonDocument.Parse(payloadJson);
		var root = payload.RootElement;

		Assert.Equal("plain body", root.GetProperty("text").GetString());
		Assert.True(root.TryGetProperty("html", out var htmlProperty));
		Assert.Equal(JsonValueKind.Null, htmlProperty.ValueKind);
	}

	[Fact]
	public async Task SendEmailAsync_WhenApiKeyMissing_DoesNotCallResend()
	{
		var callCount = 0;
		var handler = new StubHttpMessageHandler(_ =>
		{
			callCount++;
			return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
		});

		using var httpClient = new HttpClient(handler)
		{
			BaseAddress = new Uri("https://api.resend.com/")
		};

		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Email:Resend:ApiKey"] = ""
		});

		var sut = new ResendEmailNotificationService(httpClient, config, NullLogger<ResendEmailNotificationService>.Instance);
		var command = new TestEmailCommand(
			To: "user@example.com",
			Subject: "No key",
			Body: "body",
			IsHtml: false,
			From: null,
			Cc: null,
			Bcc: null,
			Attachments: null);

		await sut.SendEmailAsync(command, CancellationToken.None);

		Assert.Equal(0, callCount);
	}

	private static IConfiguration BuildConfig(Dictionary<string, string?> values)
	{
		return new ConfigurationBuilder()
			.AddInMemoryCollection(values)
			.Build();
	}

	private sealed record TestEmailCommand(
		string To,
		string Subject,
		string Body,
		bool IsHtml,
		string? From,
		IEnumerable<string>? Cc,
		IEnumerable<string>? Bcc,
		IEnumerable<IEmailAttachment>? Attachments) : ISendEmailCommand
	{
		public Guid MessageId { get; } = Guid.NewGuid();
		public DateTime RequestedAt { get; } = DateTime.UtcNow;
		public string? CorrelationId { get; } = "test-correlation";
	}

	private sealed record TestAttachment(string FileName, string ContentType, byte[] Content) : IEmailAttachment;

	private sealed class StubHttpMessageHandler : HttpMessageHandler
	{
		private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _responseFactory;

		public StubHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> responseFactory)
		{
			_responseFactory = responseFactory;
		}

		protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
		{
			return _responseFactory(request);
		}
	}

	private sealed record CapturedRequestData(
		HttpMethod Method,
		string? RequestUri,
		string? AuthorizationScheme,
		string? AuthorizationParameter,
		string? Body);
}
