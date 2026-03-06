using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ProzoroBanka.IntegrationTests.Api;

public class AuthEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;

	public AuthEndpointsTests(TestWebApplicationFactory factory)
	{
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
}