using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ProzoroBanka.IntegrationTests.Api;

public class CampaignsEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;

	public CampaignsEndpointsTests(TestWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task CreateCampaign_WhenBelowPlanLimit_ReturnsOk()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Campaign Org {Guid.NewGuid():N}");

		var response = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/campaigns", new
		{
			title = "Збір на дрони",
			description = "Інтеграційний тест",
			goalAmount = 100000,
			deadline = DateTime.UtcNow.AddDays(15),
			sendUrl = "https://send.monobank.ua/jar/test"
		});

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);
		var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("Збір на дрони", payload.GetProperty("title").GetString());
	}

	[Fact]
	public async Task CreateCampaign_WhenPlanLimitReached_ReturnsBadRequest()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Limit Org {Guid.NewGuid():N}");

		for (var i = 0; i < 3; i++)
		{
			var seed = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/campaigns", new
			{
				title = $"Seed campaign {i}",
				description = "seed",
				goalAmount = 50000,
				deadline = DateTime.UtcNow.AddDays(30 + i)
			});
			Assert.Equal(HttpStatusCode.OK, seed.StatusCode);
		}

		var overflow = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/campaigns", new
		{
			title = "Overflow campaign",
			description = "should fail",
			goalAmount = 70000,
			deadline = DateTime.UtcNow.AddDays(40)
		});

		Assert.Equal(HttpStatusCode.BadRequest, overflow.StatusCode);
		var error = await overflow.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Contains("ліміт зборів", error.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
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
