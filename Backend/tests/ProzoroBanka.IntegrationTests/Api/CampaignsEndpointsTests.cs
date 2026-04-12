using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.IntegrationTests.Api;

public class CampaignsEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly TestWebApplicationFactory _factory;
	private readonly HttpClient _client;

	public CampaignsEndpointsTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
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
	public async Task GetCampaignDetails_UsesOnlyActiveVerifiedReceiptsForDocumentedAmount()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Detail Org {Guid.NewGuid():N}");
		var campaignId = await CreateCampaignAsync(orgId, $"Detail Campaign {Guid.NewGuid():N}");

		await SeedCampaignReceiptsAsync(orgId, campaignId);

		var response = await _client.GetAsync($"/api/campaigns/{campaignId}");
		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(60300, payload.GetProperty("documentedAmount").GetInt64());
		Assert.Equal(100, payload.GetProperty("documentationPercent").GetDouble());
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

	private async Task<Guid> CreateCampaignAsync(Guid orgId, string title)
	{
		var response = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/campaigns", new
		{
			title,
			description = "Integration test campaign",
			goalAmount = 100000,
			deadline = DateTime.UtcNow.AddDays(14)
		});
		response.EnsureSuccessStatusCode();
		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		return json.GetProperty("id").GetGuid();
	}

	private async Task SeedCampaignReceiptsAsync(Guid organizationId, Guid campaignId)
	{
		using var scope = _factory.Services.CreateScope();
		var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		var ownerUserId = await db.Organizations
			.Where(org => org.Id == organizationId)
			.Select(org => org.OwnerUserId)
			.SingleAsync();

		var campaign = await db.Campaigns.SingleAsync(c => c.Id == campaignId);
		campaign.CurrentAmount = 60300;

		db.Receipts.AddRange(
			new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = ownerUserId,
				OrganizationId = organizationId,
				CampaignId = campaignId,
				StorageKey = "verified-active.jpg",
				OriginalFileName = "verified-active.jpg",
				Status = ReceiptStatus.StateVerified,
				PublicationStatus = ReceiptPublicationStatus.Active,
				TotalAmount = 606.13m,
				CreatedAt = DateTime.UtcNow,
			},
			new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = ownerUserId,
				OrganizationId = organizationId,
				CampaignId = campaignId,
				StorageKey = "verified-draft.jpg",
				OriginalFileName = "verified-draft.jpg",
				Status = ReceiptStatus.StateVerified,
				PublicationStatus = ReceiptPublicationStatus.Draft,
				TotalAmount = 193.87m,
				CreatedAt = DateTime.UtcNow,
			});

		await db.SaveChangesAsync();
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
