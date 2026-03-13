using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ProzoroBanka.IntegrationTests.Api;

public class TeamManagementEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;

	public TeamManagementEndpointsTests(TestWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task LeaveOrganization_WhenOwner_ReturnsBadRequest()
	{
		await AuthenticateAsAdminAsync();

		var createResponse = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name = $"Owner Org {Guid.NewGuid():N}",
			description = "Owner org",
			website = "https://owner.example.org",
			contactEmail = "owner@example.org"
		});
		createResponse.EnsureSuccessStatusCode();

		var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
		var orgId = created.GetProperty("id").GetGuid();

		var leaveResponse = await _client.PostAsync($"/api/organizations/{orgId}/leave", content: null);
		Assert.Equal(HttpStatusCode.BadRequest, leaveResponse.StatusCode);
	}

	[Fact]
	public async Task LeaveOrganization_WhenNonOwnerMember_ReturnsNoContent()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		// Register and join as a new member
		var memberEmail = $"leaver-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(memberEmail, "Password123!");
		await AuthenticateAsync(memberEmail, "Password123!");

		var acceptResponse = await _client.PostAsync($"/api/invitations/{token}/accept", content: null);
		Assert.Equal(HttpStatusCode.NoContent, acceptResponse.StatusCode);

		// New member leaves
		var leaveResponse = await _client.PostAsync($"/api/organizations/{orgId}/leave", content: null);
		Assert.Equal(HttpStatusCode.NoContent, leaveResponse.StatusCode);
	}

	[Fact]
	public async Task UpdateMemberRole_WhenOwner_ReturnsUpdatedMember()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		// Register and join as a new member, get their domain user ID from members list
		var memberEmail = $"role-target-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(memberEmail, "Password123!");
		await AuthenticateAsync(memberEmail, "Password123!");
		await _client.PostAsync($"/api/invitations/{token}/accept", content: null);

		await AuthenticateAsAdminAsync();
		var membersResponse = await _client.GetAsync($"/api/organizations/{orgId}/members");
		var members = await membersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var targetMember = members.EnumerateArray()
			.First(m => m.GetProperty("email").GetString() == memberEmail);
		var targetUserId = targetMember.GetProperty("userId").GetGuid();

		// Owner updates the new member's role to Admin
		var updateResponse = await _client.PutAsJsonAsync(
			$"/api/organizations/{orgId}/members/{targetUserId}", new
			{
				newRole = 1, // Admin
				newPermissionsFlags = 7 // ManageOrganization | ManageMembers | ManageInvitations
			});
		Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

		var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(1, updated.GetProperty("role").GetInt32());
	}

	[Fact]
	public async Task RemoveMember_WhenOwner_ReturnsNoContent()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		// Register and join as a new member
		var memberEmail = $"removable-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(memberEmail, "Password123!");
		await AuthenticateAsync(memberEmail, "Password123!");
		await _client.PostAsync($"/api/invitations/{token}/accept", content: null);

		// Find the new member's userId
		await AuthenticateAsAdminAsync();
		var membersResponse = await _client.GetAsync($"/api/organizations/{orgId}/members");
		var members = await membersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var targetMember = members.EnumerateArray()
			.First(m => m.GetProperty("email").GetString() == memberEmail);
		var targetUserId = targetMember.GetProperty("userId").GetGuid();

		// Owner removes the member
		var removeResponse = await _client.DeleteAsync($"/api/organizations/{orgId}/members/{targetUserId}");
		Assert.Equal(HttpStatusCode.NoContent, removeResponse.StatusCode);

		// Verify member is gone from members list
		var afterMembers = await _client.GetAsync($"/api/organizations/{orgId}/members");
		var afterJson = await afterMembers.Content.ReadFromJsonAsync<JsonElement>();
		Assert.DoesNotContain(afterJson.EnumerateArray(), m => m.GetProperty("email").GetString() == memberEmail);
	}

	private async Task<Guid> CreateOrganizationAsync()
	{
		var response = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name = $"Team Org {Guid.NewGuid():N}",
			description = "Team management test org",
			website = "https://team.example.org",
			contactEmail = "team@example.org"
		});
		response.EnsureSuccessStatusCode();
		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		return json.GetProperty("id").GetGuid();
	}

	private async Task<string> CreateInviteLinkAsync(Guid orgId)
	{
		var response = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/invites/link", new
		{
			role = 2, // Reporter
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
			firstName = "Team",
			lastName = "Member",
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
