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
			contactEmail = "updated@example.org"
		});
		Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

		var updated = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("Updated Org Name", updated.GetProperty("name").GetString());

		var membersResponse = await _client.GetAsync($"/api/organizations/{orgId}/members");
		Assert.Equal(HttpStatusCode.OK, membersResponse.StatusCode);

		var members = await membersResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.True(members.ValueKind == JsonValueKind.Array);
		Assert.NotEmpty(members.EnumerateArray());
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
}
