using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ProzoroBanka.IntegrationTests.Api;

public class InvitationsEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;

	public InvitationsEndpointsTests(TestWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task InvitationLink_AcceptFlow_CreatesMembership()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		var publicInviteResponse = await _client.GetAsync($"/api/invitations/{token}");
		Assert.Equal(HttpStatusCode.OK, publicInviteResponse.StatusCode);

		var email = $"invitee-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(email, "Password123!");
		await AuthenticateAsync(email, "Password123!");

		var acceptResponse = await _client.PostAsync($"/api/invitations/{token}/accept", content: null);
		Assert.Equal(HttpStatusCode.NoContent, acceptResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var membersResponse = await _client.GetAsync($"/api/organizations/{orgId}/members");
		Assert.Equal(HttpStatusCode.OK, membersResponse.StatusCode);

		var members = await membersResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Contains(members.EnumerateArray(), m => m.GetProperty("email").GetString() == email);
	}

	[Fact]
	public async Task AcceptInvitation_WithoutAuth_ReturnsUnauthorized()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		_client.DefaultRequestHeaders.Authorization = null;
		var acceptResponse = await _client.PostAsync($"/api/invitations/{token}/accept", content: null);

		Assert.Equal(HttpStatusCode.Unauthorized, acceptResponse.StatusCode);
	}

	private async Task<Guid> CreateOrganizationAsync()
	{
		var response = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name = $"Invite Org {Guid.NewGuid():N}",
			description = "Org for invitation flow",
			website = "https://invite.example.org",
			contactEmail = "invite@example.org"
		});
		response.EnsureSuccessStatusCode();
		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		return json.GetProperty("id").GetGuid();
	}

	private async Task<string> CreateInviteLinkAsync(Guid orgId)
	{
		var response = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/invites/link", new
		{
			role = 2,
			expiresInHours = 24
		});
		response.EnsureSuccessStatusCode();

		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		return json.GetProperty("token").GetString()!;
	}

	private async Task RegisterAsync(string email, string password)
	{
		var response = await _client.PostAsJsonAsync("/api/auth/register", new
		{
			email,
			password,
			confirmPassword = password,
			firstName = "Invited",
			lastName = "User",
			turnstileToken = "test-token"
		});
		response.EnsureSuccessStatusCode();
	}

	private async Task AuthenticateAsAdminAsync()
	{
		await AuthenticateAsync("admin@example.com", "Admin123!ChangeMe");
	}

	private async Task AuthenticateAsync(string email, string password)
	{
		var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email,
			password,
			turnstileToken = "test-token"
		});
		loginResponse.EnsureSuccessStatusCode();

		var loginJson = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
		var accessToken = loginJson.GetProperty("accessToken").GetString();
		_client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
	}
}
