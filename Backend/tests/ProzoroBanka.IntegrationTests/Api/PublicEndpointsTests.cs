using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.IntegrationTests.Api;

public class PublicEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly TestWebApplicationFactory _factory;
	private readonly HttpClient _client;

	public PublicEndpointsTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task PublicCampaign_And_Organization_Endpoints_AreAccessibleWithoutAuth()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Public Org {Guid.NewGuid():N}");
		var org = await GetOrganizationAsync(orgId);
		var campaignId = await CreateCampaignAsync(orgId, $"Public Campaign {Guid.NewGuid():N}");
		await ActivateCampaignAsync(campaignId);

		_client.DefaultRequestHeaders.Authorization = null;

		var orgResponse = await _client.GetAsync($"/api/public/organizations/{org.GetProperty("slug").GetString()}");
		Assert.Equal(HttpStatusCode.OK, orgResponse.StatusCode);

		var campaignResponse = await _client.GetAsync($"/api/public/campaigns/{campaignId}");
		Assert.Equal(HttpStatusCode.OK, campaignResponse.StatusCode);
	}

	[Fact]
	public async Task PublicCampaignSearch_ReturnsCampaignsWithoutAuth()
	{
		await AuthenticateAsAdminAsync();
		var unique = Guid.NewGuid().ToString("N");
		var orgId = await CreateOrganizationAsync($"Search Org {unique}");
		var org = await GetOrganizationAsync(orgId);
		var campaignId = await CreateCampaignAsync(orgId, $"Search Campaign {unique}");
		await ActivateCampaignAsync(campaignId);

		_client.DefaultRequestHeaders.Authorization = null;

		var response = await _client.GetAsync($"/api/public/campaigns/search?query={Uri.EscapeDataString(unique)}&verifiedOnly=false&page=1&pageSize=12");
		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
		var items = payload.GetProperty("items");
		Assert.True(items.GetArrayLength() >= 1);
		Assert.Contains(items.EnumerateArray(), item => item.GetProperty("id").GetGuid() == campaignId);
		Assert.Contains(items.EnumerateArray(), item => item.GetProperty("organizationSlug").GetString() == org.GetProperty("slug").GetString());
	}

	[Fact]
	public async Task PublicReceipt_ReturnsNotFound_ForNonVerifiedReceipt()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Receipt Org {Guid.NewGuid():N}");
		var org = await GetOrganizationAsync(orgId);
		var campaignId = await CreateCampaignAsync(orgId, $"Receipt Campaign {Guid.NewGuid():N}");
		await ActivateCampaignAsync(campaignId);

		Guid draftReceiptId;
		using (var scope = _factory.Services.CreateScope())
		{
			var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
			var ownerUserId = org.GetProperty("ownerUserId").GetGuid();

			var draft = new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = ownerUserId,
				StorageKey = "draft-receipt.png",
				OriginalFileName = "draft-receipt.png",
				Status = ReceiptStatus.Draft,
				TotalAmount = 42m
			};
			draftReceiptId = draft.Id;
			db.Receipts.Add(draft);
			await db.SaveChangesAsync();
		}

		_client.DefaultRequestHeaders.Authorization = null;

		var orgCampaignsResponse = await _client.GetAsync($"/api/public/organizations/{org.GetProperty("slug").GetString()}/campaigns");
		Assert.Equal(HttpStatusCode.OK, orgCampaignsResponse.StatusCode);

		var receiptResponse = await _client.GetAsync($"/api/public/receipts/{draftReceiptId}");
		Assert.Equal(HttpStatusCode.NotFound, receiptResponse.StatusCode);
	}

	[Fact]
	public async Task PublicReceipt_ReturnsItemsAndItemPhotos_ForVerifiedActiveReceipt()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Receipt DTO Org {Guid.NewGuid():N}");
		var org = await GetOrganizationAsync(orgId);
		var campaignId = await CreateCampaignAsync(orgId, $"Receipt DTO Campaign {Guid.NewGuid():N}");
		await ActivateCampaignAsync(campaignId);

		Guid receiptId;
		Guid itemId;
		using (var scope = _factory.Services.CreateScope())
		{
			var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
			var ownerUserId = org.GetProperty("ownerUserId").GetGuid();

			var receipt = new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = ownerUserId,
				OrganizationId = orgId,
				CampaignId = campaignId,
				StorageKey = "public-receipt.png",
				OriginalFileName = "public-receipt.png",
				MerchantName = "Фудком",
				TotalAmount = 34040,
				Status = ReceiptStatus.StateVerified,
				PublicationStatus = ReceiptPublicationStatus.Active,
			};

			var item = new CampaignItem
			{
				Id = Guid.NewGuid(),
				ReceiptId = receipt.Id,
				Name = "Сир",
				Quantity = 1,
				UnitPrice = 12000,
				TotalPrice = 12000,
				SortOrder = 0,
			};

			var itemPhoto = new ReceiptItemPhoto
			{
				Id = Guid.NewGuid(),
				ReceiptId = receipt.Id,
				CampaignItemId = item.Id,
				StorageKey = "public-item-photo.png",
				OriginalFileName = "public-item-photo.png",
				SortOrder = 0,
			};

			receiptId = receipt.Id;
			itemId = item.Id;

			db.Receipts.Add(receipt);
			db.CampaignItems.Add(item);
			db.ReceiptItemPhotos.Add(itemPhoto);
			await db.SaveChangesAsync();
		}

		_client.DefaultRequestHeaders.Authorization = null;

		var response = await _client.GetAsync($"/api/public/receipts/{receiptId}");
		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
		var items = payload.GetProperty("items");
		var itemPhotos = payload.GetProperty("itemPhotos");

		Assert.True(items.GetArrayLength() > 0);
		Assert.True(itemPhotos.GetArrayLength() > 0);
		Assert.Contains(items.EnumerateArray(), i => i.GetProperty("id").GetGuid() == itemId);
		Assert.Contains(itemPhotos.EnumerateArray(), p => p.GetProperty("receiptItemId").GetGuid() == itemId);
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
            AuthTestHelpers.ApplyCsrfHeader(_client, loginResponse);
	}

	private async Task<Guid> CreateOrganizationAsync(string name)
	{
		var response = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name,
			description = "Public integration org",
			website = "https://example.org",
			contactEmail = "public@example.org"
		});
		response.EnsureSuccessStatusCode();
		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		return json.GetProperty("id").GetGuid();
	}

	private async Task<JsonElement> GetOrganizationAsync(Guid orgId)
	{
		var response = await _client.GetAsync($"/api/organizations/{orgId}");
		response.EnsureSuccessStatusCode();
		return (await response.Content.ReadFromJsonAsync<JsonElement>());
	}

	private async Task<Guid> CreateCampaignAsync(Guid orgId, string title)
	{
		var response = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/campaigns", new
		{
			titleUk = title,
			titleEn = title,
			description = "Public campaign",
			goalAmount = 10000,
			deadline = DateTime.UtcNow.AddDays(14)
		});
		response.EnsureSuccessStatusCode();
		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		return json.GetProperty("id").GetGuid();
	}

	private async Task ActivateCampaignAsync(Guid campaignId)
	{
		var response = await _client.PutAsJsonAsync($"/api/campaigns/{campaignId}/status", new
		{
			newStatus = CampaignStatus.Active
		});
		response.EnsureSuccessStatusCode();
	}
}
