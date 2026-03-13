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
