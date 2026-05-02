using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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
	public async Task Login_Admin_SetsCookies_AndReturnsUserPayload()
	{
		var response = await LoginAsync("admin@example.com", "Admin123!ChangeMe");

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);
		Assert.NotNull(AuthTestHelpers.ExtractCookieValue(response, "pb_access_token"));
		Assert.NotNull(AuthTestHelpers.ExtractCookieValue(response, "pb_refresh_token"));
		Assert.NotNull(AuthTestHelpers.ExtractCookieValue(response, "pb_csrf_token"));

		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("admin@example.com", json.GetProperty("user").GetProperty("email").GetString());
		Assert.False(json.TryGetProperty("accessToken", out _));
		Assert.False(json.TryGetProperty("refreshToken", out _));
	}

	[Fact]
	public async Task Refresh_UsesCookiesAndResetsAuthCookies()
	{
		var loginResponse = await LoginAsync("admin@example.com", "Admin123!ChangeMe");
		loginResponse.EnsureSuccessStatusCode();
		AuthTestHelpers.ApplyCsrfHeader(_client, loginResponse);

		var refreshResponse = await _client.PostAsync("/api/auth/refresh", content: null);

		Assert.Equal(HttpStatusCode.NoContent, refreshResponse.StatusCode);
		Assert.NotNull(AuthTestHelpers.ExtractCookieValue(refreshResponse, "pb_access_token"));
		Assert.NotNull(AuthTestHelpers.ExtractCookieValue(refreshResponse, "pb_refresh_token"));
	}

	[Fact]
	public async Task ProtectedEndpoint_WithBearerTokenOnly_ReturnsUnauthorized()
	{
		var loginResponse = await LoginAsync("admin@example.com", "Admin123!ChangeMe");
		loginResponse.EnsureSuccessStatusCode();

		var accessToken = AuthTestHelpers.ExtractCookieValue(loginResponse, AuthTestHelpers.AccessTokenCookieName);
		Assert.False(string.IsNullOrWhiteSpace(accessToken));

		var bearerOnlyClient = _factory.CreateClient();
		bearerOnlyClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

		var meResponse = await bearerOnlyClient.GetAsync("/api/auth/me");
		Assert.Equal(HttpStatusCode.Unauthorized, meResponse.StatusCode);
	}

	[Fact]
	public async Task MutatingCookieRequest_WithoutCsrfHeader_ReturnsForbidden()
	{
		var cookieClient = _factory.CreateClient();
		var loginResponse = await cookieClient.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "Admin123!ChangeMe",
			turnstileToken = "test-token"
		});
		loginResponse.EnsureSuccessStatusCode();

		var updateResponse = await cookieClient.PutAsJsonAsync("/api/auth/me", new
		{
			firstName = "Updated",
			lastName = "Volunteer",
			phoneNumber = "+380671112233"
		});

		Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
	}

	[Fact]
	public async Task Me_WithCookieAuth_ReturnsCurrentUser()
	{
		var loginResponse = await LoginAsync("admin@example.com", "Admin123!ChangeMe");
		loginResponse.EnsureSuccessStatusCode();

		var meResponse = await _client.GetAsync("/api/auth/me");
		Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

		var meJson = await meResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("admin@example.com", meJson.GetProperty("email").GetString());
	}

	[Fact]
	public async Task Logout_RevokesSession_AndClearsCookies()
	{
		var loginResponse = await LoginAsync("admin@example.com", "Admin123!ChangeMe");
		loginResponse.EnsureSuccessStatusCode();
		AuthTestHelpers.ApplyCsrfHeader(_client, loginResponse);

		var logoutResponse = await _client.PostAsync("/api/auth/logout", content: null);
		Assert.Equal(HttpStatusCode.NoContent, logoutResponse.StatusCode);

		var meResponse = await _client.GetAsync("/api/auth/me");
		Assert.Equal(HttpStatusCode.Unauthorized, meResponse.StatusCode);

		var refreshResponse = await _client.PostAsync("/api/auth/refresh", content: null);
		Assert.Equal(HttpStatusCode.Unauthorized, refreshResponse.StatusCode);
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
	public async Task Register_ValidRequest_ReturnsUserPayload()
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
	public async Task UpdateProfile_WithCookieAuth_UpdatesCurrentUser()
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
		Assert.Contains("/uploads-test/", json.GetProperty("profilePhotoUrl").GetString(), StringComparison.OrdinalIgnoreCase);
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

		var hrefMatch = Regex.Match(recordedEmail!.Body, "href=\"(?<url>[^\"]+)\"", RegexOptions.IgnoreCase);
		Assert.True(hrefMatch.Success);

		var resetUri = new Uri(hrefMatch.Groups["url"].Value);
		var query = QueryHelpers.ParseQuery(resetUri.Query);
		var token = query["token"].ToString();

		var resetResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new
		{
			email,
			token,
			newPassword,
			confirmPassword = newPassword
		});
		Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

		var oldLoginResponse = await LoginAsync(email, initialPassword);
		Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);

		var newLoginResponse = await LoginAsync(email, newPassword);
		Assert.Equal(HttpStatusCode.OK, newLoginResponse.StatusCode);
	}

	private async Task AuthenticateAsAdminAsync()
	{
		_client.DefaultRequestHeaders.Authorization = null;
		_client.DefaultRequestHeaders.Remove(AuthTestHelpers.CsrfHeaderName);

		var loginResponse = await LoginAsync("admin@example.com", "Admin123!ChangeMe");
		loginResponse.EnsureSuccessStatusCode();
		AuthTestHelpers.ApplyCsrfHeader(_client, loginResponse);
	}

	private Task<HttpResponseMessage> LoginAsync(string email, string password)
	{
		return _client.PostAsJsonAsync("/api/auth/login", new
		{
			email,
			password,
			turnstileToken = "test-token"
		});
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
}
