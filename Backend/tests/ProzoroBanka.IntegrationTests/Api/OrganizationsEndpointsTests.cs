using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ProzoroBanka.IntegrationTests.Api;

public class OrganizationsEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;

	public OrganizationsEndpointsTests(TestWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task Organizations_CrudFlow_WorksForOwner()
	{
		await AuthenticateAsAdminAsync();

		var createResponse = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name = $"Test Org {Guid.NewGuid():N}",
			description = "Initial description",
			website = "https://example.org",
			contactEmail = "org@example.org"
		});
		Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

		var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
		var orgId = created.GetProperty("id").GetGuid();

		var getById = await _client.GetAsync($"/api/organizations/{orgId}");
		Assert.Equal(HttpStatusCode.OK, getById.StatusCode);

		var updateResponse = await _client.PutAsJsonAsync($"/api/organizations/{orgId}", new
		{
			name = "Updated Org Name",
			description = "Updated description",
			website = "https://updated.example.org",
			contactEmail = "updated@example.org",
			phone = "+380 67 123 45 67"
		});
		Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

		var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("Updated Org Name", updated.GetProperty("name").GetString());
		Assert.Equal("+380 67 123 45 67", updated.GetProperty("phone").GetString());

		var getUpdated = await _client.GetAsync($"/api/organizations/{orgId}");
		Assert.Equal(HttpStatusCode.OK, getUpdated.StatusCode);

		var orgJson = await getUpdated.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("+380 67 123 45 67", orgJson.GetProperty("phone").GetString());

		var membersResponse = await _client.GetAsync($"/api/organizations/{orgId}/members");
		Assert.Equal(HttpStatusCode.OK, membersResponse.StatusCode);

		var members = await membersResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.True(members.ValueKind == JsonValueKind.Array);
		Assert.NotEmpty(members.EnumerateArray());
	}

	[Fact]
	public async Task OrganizationManagement_WhenOwnerWithoutAdminRole_CanUpdateAndManageInvitations()
	{
		var email = $"org-owner-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(email, "Password123!");
		await AuthenticateAsync(email, "Password123!");

		var createResponse = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name = $"Owner Org {Guid.NewGuid():N}",
			description = "Owner managed org",
			website = "https://owner.example.org",
			contactEmail = "owner@example.org"
		});
		Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

		var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
		var orgId = created.GetProperty("id").GetGuid();

		var updateResponse = await _client.PutAsJsonAsync($"/api/organizations/{orgId}", new
		{
			name = "Owner Org Updated",
			description = "Updated by volunteer owner",
			website = "https://owner-updated.example.org",
			contactEmail = "owner-updated@example.org",
			phone = "+380 67 000 00 00"
		});
		Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

		var inviteResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/invites/link", new
		{
			role = 1,
			expiresInHours = 48
		});
		Assert.Equal(HttpStatusCode.OK, inviteResponse.StatusCode);

		var invite = await inviteResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(orgId, invite.GetProperty("organizationId").GetGuid());
		Assert.Equal(1, invite.GetProperty("role").GetInt32());
	}

	[Fact]
	public async Task DeleteOrganization_WhenOwner_ReturnsNoContent()
	{
		await AuthenticateAsAdminAsync();

		var orgId = await CreateOrganizationAsync($"Delete Org {Guid.NewGuid():N}");

		var deleteResponse = await _client.DeleteAsync($"/api/organizations/{orgId}");
		Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

		// After deletion the org should no longer be accessible (soft-deleted)
		var getResponse = await _client.GetAsync($"/api/organizations/{orgId}");
		Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
	}

	[Fact]
	public async Task GetOrganization_WithoutAuth_ReturnsUnauthorized()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Unauth Org {Guid.NewGuid():N}");

		_client.DefaultRequestHeaders.Authorization = null;
		var getResponse = await _client.GetAsync($"/api/organizations/{orgId}");
		Assert.Equal(HttpStatusCode.Unauthorized, getResponse.StatusCode);
	}

	[Fact]
	public async Task CreateOrganization_NonAdmin_WhenOwnsTenOrganizations_ReturnsBadRequest()
	{
		var email = $"volunteer-limit-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(email, "Password123!");
		await AuthenticateAsync(email, "Password123!");

		for (var i = 0; i < 10; i++)
		{
			var createOk = await _client.PostAsJsonAsync("/api/organizations", new
			{
				name = $"Volunteer Org {i} {Guid.NewGuid():N}",
				description = "Limit seed",
				website = "https://volunteer.example.org",
				contactEmail = "volunteer@example.org"
			});
			Assert.Equal(HttpStatusCode.OK, createOk.StatusCode);
		}

		var createOverflow = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name = $"Volunteer Overflow {Guid.NewGuid():N}",
			description = "Should fail",
			website = "https://overflow.example.org",
			contactEmail = "overflow@example.org"
		});

		Assert.Equal(HttpStatusCode.BadRequest, createOverflow.StatusCode);
	}

	[Fact]
	public async Task StateRegistryCredentials_UnifiedKey_IsVisibleForBothProviders_AndCanBeDeletedFromEither()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"State Registry Org {Guid.NewGuid():N}");

		var upsertResponse = await _client.PutAsJsonAsync(
			$"/api/organizations/{orgId}/state-registry-credentials/TaxService",
			new { apiKey = "unified-test-key-123456" });

		Assert.Equal(HttpStatusCode.OK, upsertResponse.StatusCode);

		var settingsResponse = await _client.GetAsync($"/api/organizations/{orgId}/state-registry-settings");
		settingsResponse.EnsureSuccessStatusCode();
		var settingsJson = await settingsResponse.Content.ReadFromJsonAsync<JsonElement>();

		Assert.True(settingsJson.GetProperty("taxService").GetProperty("isConfigured").GetBoolean());
		Assert.True(settingsJson.GetProperty("checkGovUa").GetProperty("isConfigured").GetBoolean());
		Assert.Equal(1, settingsJson.GetProperty("stateVerificationConfiguredKeys").GetInt32());
		Assert.Equal(1, settingsJson.GetProperty("stateVerificationMaxKeys").GetInt32());

		var deleteResponse = await _client.DeleteAsync($"/api/organizations/{orgId}/state-registry-credentials/CheckGovUa");
		Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

		var afterDeleteSettingsResponse = await _client.GetAsync($"/api/organizations/{orgId}/state-registry-settings");
		afterDeleteSettingsResponse.EnsureSuccessStatusCode();
		var afterDeleteJson = await afterDeleteSettingsResponse.Content.ReadFromJsonAsync<JsonElement>();

		Assert.False(afterDeleteJson.GetProperty("taxService").GetProperty("isConfigured").GetBoolean());
		Assert.False(afterDeleteJson.GetProperty("checkGovUa").GetProperty("isConfigured").GetBoolean());
		Assert.Equal(0, afterDeleteJson.GetProperty("stateVerificationConfiguredKeys").GetInt32());
	}

	[Fact]
	public async Task StateRegistryCredentials_WhenRecreatedAfterDelete_ReturnsOkAndSingleConfiguredKey()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"State Registry Recreate Org {Guid.NewGuid():N}");

		var initialUpsert = await _client.PutAsJsonAsync(
			$"/api/organizations/{orgId}/state-registry-credentials/TaxService",
			new { apiKey = "initial-key-123456" });
		Assert.Equal(HttpStatusCode.OK, initialUpsert.StatusCode);

		var deleteResponse = await _client.DeleteAsync($"/api/organizations/{orgId}/state-registry-credentials/TaxService");
		Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

		var recreateResponse = await _client.PutAsJsonAsync(
			$"/api/organizations/{orgId}/state-registry-credentials/CheckGovUa",
			new { apiKey = "recreated-key-654321" });
		Assert.Equal(HttpStatusCode.OK, recreateResponse.StatusCode);

		var settingsResponse = await _client.GetAsync($"/api/organizations/{orgId}/state-registry-settings");
		settingsResponse.EnsureSuccessStatusCode();
		var settingsJson = await settingsResponse.Content.ReadFromJsonAsync<JsonElement>();

		Assert.True(settingsJson.GetProperty("taxService").GetProperty("isConfigured").GetBoolean());
		Assert.True(settingsJson.GetProperty("checkGovUa").GetProperty("isConfigured").GetBoolean());
		Assert.Equal(1, settingsJson.GetProperty("stateVerificationConfiguredKeys").GetInt32());
	}

	[Fact]
	public async Task AdminBlockAndUnblockOrganization_TogglesWriteAccessForOrganizationMembers()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Blocked Org {Guid.NewGuid():N}");

		var blockResponse = await _client.PostAsJsonAsync($"/api/admin/organizations/{orgId}/block", new
		{
			reason = "Terms violation"
		});
		Assert.Equal(HttpStatusCode.OK, blockResponse.StatusCode);

		var blockedUpdateResponse = await _client.PutAsJsonAsync($"/api/organizations/{orgId}", new
		{
			name = "Should Not Update While Blocked",
			description = "Blocked edit",
			website = "https://blocked.example.org",
			contactEmail = "blocked@example.org",
			phone = "+380 50 111 22 33"
		});

		Assert.Equal(HttpStatusCode.Forbidden, blockedUpdateResponse.StatusCode);

		var unblockResponse = await _client.PostAsync($"/api/admin/organizations/{orgId}/unblock", content: null);
		Assert.Equal(HttpStatusCode.OK, unblockResponse.StatusCode);

		var unblockedUpdateResponse = await _client.PutAsJsonAsync($"/api/organizations/{orgId}", new
		{
			name = "Updated After Unblock",
			description = "Unblocked edit",
			website = "https://unblocked.example.org",
			contactEmail = "unblocked@example.org",
			phone = "+380 50 444 55 66"
		});

		Assert.Equal(HttpStatusCode.OK, unblockedUpdateResponse.StatusCode);
	}

	private async Task<Guid> CreateOrganizationAsync(string name)
	{
		var response = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name,
			description = "Integration test org",
			website = "https://test.example.org",
			contactEmail = "test@example.org"
		});
		response.EnsureSuccessStatusCode();
		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		return json.GetProperty("id").GetGuid();
	}

	private async Task AuthenticateAsAdminAsync()
	{
		await AuthenticateAsync("admin@example.com", "Admin123!ChangeMe");
	}

	private async Task RegisterAsync(string email, string password)
	{
		var response = await _client.PostAsJsonAsync("/api/auth/register", new
		{
			email,
			password,
			confirmPassword = password,
			firstName = "Test",
			lastName = "Volunteer",
			turnstileToken = "test-token"
		});

		response.EnsureSuccessStatusCode();
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
