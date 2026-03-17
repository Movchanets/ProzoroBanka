using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.IntegrationTests.Api;

public class AuthEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly TestWebApplicationFactory _factory;
	private readonly HttpClient _client;

	public AuthEndpointsTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task Login_Admin_ReturnsAuthPayload()
	{
		var response = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "Admin123!ChangeMe",
			turnstileToken = "test-token"
		});

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		Assert.True(json.TryGetProperty("accessToken", out var accessToken));
		Assert.True(json.TryGetProperty("refreshToken", out var refreshToken));
		Assert.True(json.TryGetProperty("user", out var user));
		Assert.False(string.IsNullOrWhiteSpace(accessToken.GetString()));
		Assert.False(string.IsNullOrWhiteSpace(refreshToken.GetString()));
		Assert.Equal("admin@example.com", user.GetProperty("email").GetString());
	}

	[Fact]
	public async Task Login_InvalidPassword_ReturnsUnauthorized()
	{
		var response = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "wrong-password",
			turnstileToken = "test-token"
		});

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task Login_MissingTurnstileToken_ReturnsBadRequest()
	{
		var response = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "Admin123!ChangeMe",
			turnstileToken = ""
		});

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Register_ValidRequest_ReturnsAuthPayload()
	{
		var email = $"user-{Guid.NewGuid():N}@example.com";

		var response = await _client.PostAsJsonAsync("/api/auth/register", new
		{
			email,
			password = "Password123!",
			confirmPassword = "Password123!",
			firstName = "Test",
			lastName = "Volunteer",
			turnstileToken = "test-token"
		});

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(email, json.GetProperty("user").GetProperty("email").GetString());
	}

	[Fact]
	public async Task Register_DuplicateEmail_ReturnsBadRequest()
	{
		var payload = new
		{
			email = $"duplicate-{Guid.NewGuid():N}@example.com",
			password = "Password123!",
			confirmPassword = "Password123!",
			firstName = "Test",
			lastName = "Volunteer",
			turnstileToken = "test-token"
		};

		var firstResponse = await _client.PostAsJsonAsync("/api/auth/register", payload);
		firstResponse.EnsureSuccessStatusCode();

		var secondResponse = await _client.PostAsJsonAsync("/api/auth/register", payload);

		Assert.Equal(HttpStatusCode.BadRequest, secondResponse.StatusCode);
	}

	[Fact]
	public async Task Refresh_ValidTokenPair_ReturnsNewTokens()
	{
		var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "Admin123!ChangeMe",
			turnstileToken = "test-token"
		});
		loginResponse.EnsureSuccessStatusCode();

		var loginJson = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
		var accessToken = loginJson.GetProperty("accessToken").GetString();
		var refreshToken = loginJson.GetProperty("refreshToken").GetString();

		var refreshResponse = await _client.PostAsJsonAsync("/api/auth/refresh", new
		{
			accessToken,
			refreshToken
		});

		Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

		var refreshJson = await refreshResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.False(string.IsNullOrWhiteSpace(refreshJson.GetProperty("accessToken").GetString()));
		Assert.False(string.IsNullOrWhiteSpace(refreshJson.GetProperty("refreshToken").GetString()));
	}

	[Fact]
	public async Task Me_WithValidBearerToken_ReturnsCurrentUser()
	{
		var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "Admin123!ChangeMe",
			turnstileToken = "test-token"
		});
		loginResponse.EnsureSuccessStatusCode();

		var loginJson = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
		var accessToken = loginJson.GetProperty("accessToken").GetString();

		_client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

		var meResponse = await _client.GetAsync("/api/auth/me");

		Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

		var meJson = await meResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("admin@example.com", meJson.GetProperty("email").GetString());
	}

	[Fact]
	public async Task UpdateProfile_WithValidBearerToken_UpdatesCurrentUser()
	{
		await AuthenticateAsAdminAsync();

		var response = await _client.PutAsJsonAsync("/api/auth/me", new
		{
			firstName = "Updated",
			lastName = "Volunteer",
			phoneNumber = "+380671112233"
		});

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("Updated", json.GetProperty("firstName").GetString());
		Assert.Equal("Volunteer", json.GetProperty("lastName").GetString());
		Assert.Equal("+380671112233", json.GetProperty("phoneNumber").GetString());
	}

	[Fact]
	public async Task UpdateProfile_WithoutToken_ReturnsUnauthorized()
	{
		var response = await _client.PutAsJsonAsync("/api/auth/me", new
		{
			firstName = "Updated",
			lastName = "Volunteer",
			phoneNumber = "+380671112233"
		});

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task UploadAvatar_WithImage_ReturnsProfilePhotoUrl()
	{
		await AuthenticateAsAdminAsync();

		using var form = new MultipartFormDataContent();
		using var fileContent = new ByteArrayContent(CreateTinyPng());
		fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
		form.Add(fileContent, "file", "avatar.png");

		var response = await _client.PostAsync("/api/auth/me/avatar", form);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		var profilePhotoUrl = json.GetProperty("profilePhotoUrl").GetString();
		Assert.False(string.IsNullOrWhiteSpace(profilePhotoUrl));
		Assert.Contains("/uploads-test/", profilePhotoUrl, StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task UploadAvatar_WithUnsupportedContentType_ReturnsBadRequest()
	{
		await AuthenticateAsAdminAsync();

		using var form = new MultipartFormDataContent();
		using var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("not-an-image"));
		fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
		form.Add(fileContent, "file", "avatar.txt");

		var response = await _client.PostAsync("/api/auth/me/avatar", form);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Register_InvalidTurnstile_ReturnsBadRequest()
	{
		using var client = CreateClientWithTurnstile(new AlwaysInvalidTurnstileService());

		var response = await client.PostAsJsonAsync("/api/auth/register", new
		{
			email = $"turnstile-{Guid.NewGuid():N}@example.com",
			password = "Password123!",
			confirmPassword = "Password123!",
			firstName = "Turnstile",
			lastName = "Failure",
			turnstileToken = "invalid-token"
		});

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task GoogleLogin_TurnstileError_ReturnsInternalServerError()
	{
		using var client = CreateClientWithTurnstile(new ThrowingTurnstileService());

		var response = await client.PostAsJsonAsync("/api/auth/google", new
		{
			idToken = "dummy-google-id-token",
			turnstileToken = "token-that-throws"
		});

		Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
	}

	[Fact]
	public async Task ForgotPassword_ThenResetPassword_UpdatesCredentialsUsingEmailLink()
	{
		var email = $"reset-{Guid.NewGuid():N}@example.com";
		const string initialPassword = "Password123!";
		const string newPassword = "Password456!";

		var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
		{
			email,
			password = initialPassword,
			confirmPassword = initialPassword,
			firstName = "Reset",
			lastName = "Tester",
			turnstileToken = "test-token"
		});
		registerResponse.EnsureSuccessStatusCode();

		_factory.EmailRecorder.Clear();

		var forgotRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/forgot-password")
		{
			Content = JsonContent.Create(new
			{
				email,
				turnstileToken = "test-token"
			})
		};
		forgotRequest.Headers.TryAddWithoutValidation("Origin", "http://localhost:5173");

		var forgotResponse = await _client.SendAsync(forgotRequest);
		Assert.Equal(HttpStatusCode.OK, forgotResponse.StatusCode);

		var recordedEmail = _factory.EmailRecorder.Snapshot()
			.LastOrDefault(m => string.Equals(m.To, email, StringComparison.OrdinalIgnoreCase));

		Assert.NotNull(recordedEmail);
		Assert.DoesNotContain("\\\"", recordedEmail!.Body, StringComparison.Ordinal);

		var hrefMatch = Regex.Match(recordedEmail.Body, "href=\"(?<url>[^\"]+)\"", RegexOptions.IgnoreCase);
		Assert.True(hrefMatch.Success);

		var resetUrl = hrefMatch.Groups["url"].Value;
		Assert.True(Uri.TryCreate(resetUrl, UriKind.Absolute, out var parsedResetUri));
		Assert.Equal("/reset-password", parsedResetUri!.AbsolutePath);

		var resetQuery = QueryHelpers.ParseQuery(parsedResetUri.Query);
		Assert.True(resetQuery.TryGetValue("email", out var emailValue));
		Assert.True(resetQuery.TryGetValue("token", out var tokenValue));
		Assert.Equal(email, emailValue.ToString());
		Assert.False(string.IsNullOrWhiteSpace(tokenValue.ToString()));

		var resetResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new
		{
			email,
			token = tokenValue.ToString(),
			newPassword,
			confirmPassword = newPassword
		});
		Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

		var oldLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email,
			password = initialPassword,
			turnstileToken = "test-token"
		});
		Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);

		var newLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email,
			password = newPassword,
			turnstileToken = "test-token"
		});
		Assert.Equal(HttpStatusCode.OK, newLoginResponse.StatusCode);
	}

	private async Task AuthenticateAsAdminAsync()
	{
		_client.DefaultRequestHeaders.Authorization = null;

		var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "Admin123!ChangeMe",
			turnstileToken = "test-token"
		});
		loginResponse.EnsureSuccessStatusCode();

		var loginJson = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
		var accessToken = loginJson.GetProperty("accessToken").GetString();
		_client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
	}

	private HttpClient CreateClientWithTurnstile(ITurnstileService turnstileService)
	{
		return _factory.WithWebHostBuilder(builder =>
		{
			builder.ConfigureServices(services =>
			{
				services.RemoveAll<ITurnstileService>();
				services.AddSingleton(turnstileService);
			});
		}).CreateClient();
	}

	private static byte[] CreateTinyPng()
	{
		return
		[
			0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
			0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
			0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
			0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
			0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
			0x54, 0x78, 0x9C, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
			0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
			0x18, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
			0x44, 0xAE, 0x42, 0x60, 0x82
		];
	}

	private sealed class AlwaysInvalidTurnstileService : ITurnstileService
	{
		public Task<bool> ValidateAsync(string token, string? remoteIp = null, CancellationToken ct = default)
		{
			return Task.FromResult(false);
		}
	}

	private sealed class ThrowingTurnstileService : ITurnstileService
	{
		public Task<bool> ValidateAsync(string token, string? remoteIp = null, CancellationToken ct = default)
		{
			throw new InvalidOperationException("Turnstile exploded");
		}
	}
}