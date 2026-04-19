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

public class PurchasesOperationsEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public PurchasesOperationsEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateDraftPurchase_ReturnsCreated_AndPersistsDraft()
    {
        await AuthenticateAsAdminAsync();
        var orgId = await CreateOrganizationAsync($"Draft Org {Guid.NewGuid():N}");

        var response = await _client.PostAsJsonAsync("/api/purchases/draft", new
        {
            organizationId = orgId,
            title = "Draft purchase",
            description = "Draft description"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var purchaseId = payload.GetProperty("id").GetGuid();

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var purchase = await db.CampaignPurchases.SingleOrDefaultAsync(p => p.Id == purchaseId);

        Assert.NotNull(purchase);
        Assert.Null(purchase!.CampaignId);
        Assert.Equal("Draft purchase", purchase.Title);
        Assert.Equal("Draft description", purchase.Description);
    }

    [Fact]
    public async Task AttachPurchaseToCampaign_ReturnsOk_AndUpdatesCampaignId()
    {
        await AuthenticateAsAdminAsync();
        var orgId = await CreateOrganizationAsync($"Attach Org {Guid.NewGuid():N}");
        var campaignId = await CreateCampaignAsync(orgId, $"Attach Campaign {Guid.NewGuid():N}");
        await SetCampaignStatusAsync(campaignId, CampaignStatus.Active);

        var draftResponse = await _client.PostAsJsonAsync("/api/purchases/draft", new
        {
            organizationId = orgId,
            title = "Attach me",
            description = "Draft"
        });
        draftResponse.EnsureSuccessStatusCode();
        var draftJson = await draftResponse.Content.ReadFromJsonAsync<JsonElement>();
        var purchaseId = draftJson.GetProperty("id").GetGuid();

        var attachResponse = await _client.PostAsJsonAsync($"/api/purchases/{purchaseId}/attach", new
        {
            campaignId
        });

        Assert.Equal(HttpStatusCode.OK, attachResponse.StatusCode);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var purchase = await db.CampaignPurchases.SingleOrDefaultAsync(p => p.Id == purchaseId);

        Assert.NotNull(purchase);
        Assert.Equal(campaignId, purchase!.CampaignId);
    }

    [Fact]
    public async Task AddWaybillItem_ReturnsCreated_AndPersistsCampaignItem()
    {
        await AuthenticateAsAdminAsync();
        var orgId = await CreateOrganizationAsync($"Waybill Org {Guid.NewGuid():N}");
        var campaignId = await CreateCampaignAsync(orgId, $"Waybill Campaign {Guid.NewGuid():N}");
        var purchaseId = await CreatePurchaseAsync(orgId, campaignId);

        var documentId = await SeedWaybillDocumentAsync(purchaseId);

        var response = await _client.PostAsJsonAsync($"/api/purchases/documents/{documentId}/items", new
        {
            name = "Thermal scope",
            quantity = 3m,
            unitPrice = 250000L
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var itemId = payload.GetProperty("id").GetGuid();

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var item = await db.CampaignItems.SingleOrDefaultAsync(i => i.Id == itemId);

        Assert.NotNull(item);
        Assert.Equal("Thermal scope", item!.Name);
        Assert.Equal(3m, item.Quantity);
        Assert.Equal(250000L, item.UnitPrice);
        Assert.Equal(750000L, item.TotalPrice);
        Assert.Equal(documentId, item.CampaignDocumentId);
    }

    private async Task<Guid> CreateOrganizationAsync(string name)
    {
        var response = await _client.PostAsJsonAsync("/api/organizations", new
        {
            name,
            description = "Purchases integration test org",
            website = "https://test.example.org",
            contactEmail = "test@example.org"
        });

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        return payload.GetProperty("id").GetGuid();
    }

    private async Task<Guid> CreateCampaignAsync(Guid organizationId, string title)
    {
        var response = await _client.PostAsJsonAsync($"/api/organizations/{organizationId}/campaigns", new
        {
            titleUk = title,
            titleEn = title,
            description = "Integration test campaign",
            goalAmount = 100000,
            deadline = DateTime.UtcNow.AddDays(7)
        });

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        return payload.GetProperty("id").GetGuid();
    }

    private async Task SetCampaignStatusAsync(Guid campaignId, CampaignStatus status)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var campaign = await db.Campaigns.SingleAsync(c => c.Id == campaignId);
        campaign.Status = status;
        await db.SaveChangesAsync();
    }

    private async Task<Guid> CreatePurchaseAsync(Guid organizationId, Guid campaignId)
    {
        var response = await _client.PostAsJsonAsync($"/api/organizations/{organizationId}/campaigns/{campaignId}/purchases", new
        {
            title = "Purchase for waybill",
            totalAmount = 0
        });

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        return payload.GetProperty("id").GetGuid();
    }

    private async Task<Guid> SeedWaybillDocumentAsync(Guid purchaseId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var userId = await db.CampaignPurchases
            .Where(p => p.Id == purchaseId)
            .Select(p => p.CreatedByUserId)
            .SingleAsync();

        var document = new WaybillDocument
        {
            Id = Guid.NewGuid(),
            PurchaseId = purchaseId,
            UploadedByUserId = userId,
            Type = DocumentType.Waybill,
            StorageKey = $"waybill-{Guid.NewGuid():N}.pdf",
            OriginalFileName = "waybill.pdf",
            OcrProcessingStatus = OcrProcessingStatus.NotProcessed,
            IsDataVerifiedByUser = false
        };

        db.CampaignDocuments.Add(document);
        await db.SaveChangesAsync();

        return document.Id;
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
