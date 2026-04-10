using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.IntegrationTests.Api;

public class ReceiptsEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly TestWebApplicationFactory _factory;
	private readonly HttpClient _client;

	public ReceiptsEndpointsTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task Receipts_Workflow_UploadExtractVerifyActivateRetry_Works()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Receipt Org {Guid.NewGuid():N}");

		await SeedRegistryCredentialAsync(orgId, RegistryProvider.TaxService, "test-registry-token-123456");

		var uploadResponse = await UploadDraftAsync();
		Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);
		var uploadJson = await uploadResponse.Content.ReadFromJsonAsync<JsonElement>();
		var receiptId = uploadJson.GetProperty("id").GetGuid();

		var extractResponse = await ExtractAsync(receiptId, orgId);
		Assert.Equal(HttpStatusCode.OK, extractResponse.StatusCode);

		var verifyResponse = await _client.PostAsJsonAsync($"/api/receipts/{receiptId}/verify", new { organizationId = orgId });
		Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);
		var verifyJson = await verifyResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal((int)ReceiptStatus.StateVerified, verifyJson.GetProperty("status").GetInt32());

		var activateResponse = await _client.PostAsync($"/api/receipts/{receiptId}/activate", null);
		Assert.Equal(HttpStatusCode.OK, activateResponse.StatusCode);

		var retryResponse = await _client.PostAsync($"/api/receipts/{receiptId}/retry", null);
		Assert.Equal(HttpStatusCode.BadRequest, retryResponse.StatusCode);
	}

	[Fact]
	public async Task OrganizationReceipts_ListAndDetail_ReturnUploadedReceipt()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Receipt Org Scope {Guid.NewGuid():N}");

		var uploadResponse = await UploadOrganizationDraftAsync(orgId);
		uploadResponse.EnsureSuccessStatusCode();
		var uploadJson = await uploadResponse.Content.ReadFromJsonAsync<JsonElement>();
		var receiptId = uploadJson.GetProperty("id").GetGuid();

		var listResponse = await _client.GetAsync($"/api/organizations/{orgId}/receipts");
		listResponse.EnsureSuccessStatusCode();
		var listJson = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.True(listJson.ValueKind == JsonValueKind.Array);
		Assert.Contains(listJson.EnumerateArray(), item => item.GetProperty("id").GetGuid() == receiptId);

		var detailResponse = await _client.GetAsync($"/api/organizations/{orgId}/receipts/{receiptId}");
		detailResponse.EnsureSuccessStatusCode();
		var detailJson = await detailResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(receiptId, detailJson.GetProperty("id").GetGuid());
	}

	[Fact]
	public async Task Extract_WhenCallerNotMemberOfOrganization_ReturnsBadRequest()
	{
		await AuthenticateAsAdminAsync();

		var uploadResponse = await UploadDraftAsync();
		uploadResponse.EnsureSuccessStatusCode();
		var uploadJson = await uploadResponse.Content.ReadFromJsonAsync<JsonElement>();
		var receiptId = uploadJson.GetProperty("id").GetGuid();

		var randomOrgId = Guid.NewGuid();
		var extractResponse = await ExtractAsync(receiptId, randomOrgId);

		Assert.Equal(HttpStatusCode.BadRequest, extractResponse.StatusCode);
		var error = await extractResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Contains("не є учасником організації", error.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task ReceiptItems_AddUpdateAndLinkPhoto_Works()
	{
		await AuthenticateAsAdminAsync();

		var uploadResponse = await UploadDraftAsync();
		uploadResponse.EnsureSuccessStatusCode();
		var uploadJson = await uploadResponse.Content.ReadFromJsonAsync<JsonElement>();
		var receiptId = uploadJson.GetProperty("id").GetGuid();

		var addPhotoResponse = await AddItemPhotoAsync(receiptId);
		addPhotoResponse.EnsureSuccessStatusCode();
		var addPhotoJson = await addPhotoResponse.Content.ReadFromJsonAsync<JsonElement>();
		var photoId = addPhotoJson.GetProperty("itemPhotos")[0].GetProperty("id").GetGuid();

		var addItemResponse = await _client.PostAsJsonAsync($"/api/receipts/{receiptId}/items", new
		{
			name = "Тестова позиція",
			quantity = 1,
			unitPrice = 99.99,
			totalPrice = 99.99,
			barcode = "4823096005591"
		});
		addItemResponse.EnsureSuccessStatusCode();
		var addItemJson = await addItemResponse.Content.ReadFromJsonAsync<JsonElement>();
		var itemId = addItemJson.GetProperty("items")[0].GetProperty("id").GetGuid();

		var updateItemResponse = await _client.PutAsJsonAsync($"/api/receipts/{receiptId}/items/{itemId}", new
		{
			name = "Оновлена позиція",
			quantity = 2,
			unitPrice = 2699,
			totalPrice = 5398,
			barcode = "4823096005591",
			vatRate = 20,
			vatAmount = 540,
		});
		updateItemResponse.EnsureSuccessStatusCode();
		var updateItemJson = await updateItemResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("Оновлена позиція", updateItemJson.GetProperty("items")[0].GetProperty("name").GetString());

		var linkResponse = await _client.PutAsJsonAsync($"/api/receipts/{receiptId}/item-photos/{photoId}/link", new
		{
			receiptItemId = itemId,
		});
		linkResponse.EnsureSuccessStatusCode();
		var linkJson = await linkResponse.Content.ReadFromJsonAsync<JsonElement>();

		Assert.Equal(itemId, linkJson.GetProperty("itemPhotos")[0].GetProperty("receiptItemId").GetGuid());

		var deleteItemResponse = await _client.DeleteAsync($"/api/receipts/{receiptId}/items/{itemId}");
		deleteItemResponse.EnsureSuccessStatusCode();
		var deleteItemJson = await deleteItemResponse.Content.ReadFromJsonAsync<JsonElement>();

		Assert.Equal(0, deleteItemJson.GetProperty("items").GetArrayLength());
		Assert.True(deleteItemJson.GetProperty("itemPhotos")[0].GetProperty("receiptItemId").ValueKind == JsonValueKind.Null);
	}

	[Fact]
	public async Task OrganizationReceipt_MultiUserFlow_MemberCanUpdateOwnersOcrDraft()
	{
		await AuthenticateAsAdminAsync();

		var orgId = await CreateOrganizationAsync($"Receipt Shared Org {Guid.NewGuid():N}");
		var inviteToken = await CreateInviteLinkAsync(orgId);

		var memberEmail = $"receipt-member-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(memberEmail, "Password123!");
		await AuthenticateAsync(memberEmail, "Password123!");

		var acceptInviteResponse = await _client.PostAsync($"/api/invitations/{inviteToken}/accept", content: null);
		Assert.Equal(HttpStatusCode.NoContent, acceptInviteResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var uploadResponse = await UploadOrganizationDraftAsync(orgId);
		uploadResponse.EnsureSuccessStatusCode();
		var uploadJson = await uploadResponse.Content.ReadFromJsonAsync<JsonElement>();
		var receiptId = uploadJson.GetProperty("id").GetGuid();

		await AuthenticateAsync(memberEmail, "Password123!");

		var updateRequest = new HttpRequestMessage(HttpMethod.Patch, $"/api/receipts/{receiptId}/ocr-draft")
		{
			Content = JsonContent.Create(new
			{
				alias = "shared-receipt",
				merchantName = "Shared Merchant",
				totalAmount = 198.75m,
				purchaseDateUtc = DateTime.UtcNow,
				fiscalNumber = "FN-SHARED-001",
				receiptCode = (string?)null,
				currency = "UAH",
				purchasedItemName = "Shared Item",
				ocrStructuredPayloadJson = "{}"
			})
		};

		var updateResponse = await _client.SendAsync(updateRequest);
		Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
		var updatedJson = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal("Shared Merchant", updatedJson.GetProperty("merchantName").GetString());

		await AuthenticateAsAdminAsync();
		var detailResponse = await _client.GetAsync($"/api/organizations/{orgId}/receipts/{receiptId}");
		detailResponse.EnsureSuccessStatusCode();
		var detailJson = await detailResponse.Content.ReadFromJsonAsync<JsonElement>();

		Assert.Equal("Shared Merchant", detailJson.GetProperty("merchantName").GetString());
		Assert.Equal("shared-receipt", detailJson.GetProperty("alias").GetString());
	}

	[Fact]
	public async Task DeleteReceipt_RemovesReceiptFromOrganizationList()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync($"Receipt Delete Org {Guid.NewGuid():N}");

		var uploadResponse = await UploadOrganizationDraftAsync(orgId);
		uploadResponse.EnsureSuccessStatusCode();
		var uploadJson = await uploadResponse.Content.ReadFromJsonAsync<JsonElement>();
		var receiptId = uploadJson.GetProperty("id").GetGuid();

		var deleteResponse = await _client.DeleteAsync($"/api/receipts/{receiptId}");
		Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

		var listResponse = await _client.GetAsync($"/api/organizations/{orgId}/receipts");
		listResponse.EnsureSuccessStatusCode();
		var listJson = await listResponse.Content.ReadFromJsonAsync<JsonElement>();

		Assert.DoesNotContain(listJson.EnumerateArray(), item => item.GetProperty("id").GetGuid() == receiptId);
	}

	private async Task<HttpResponseMessage> UploadDraftAsync()
	{
		using var form = new MultipartFormDataContent();
		using var fileContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71 });
		fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
		form.Add(fileContent, "file", "receipt.png");

		return await _client.PostAsync("/api/receipts/draft", form);
	}

	private async Task<HttpResponseMessage> UploadOrganizationDraftAsync(Guid organizationId)
	{
		using var form = new MultipartFormDataContent();
		using var fileContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71 });
		fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
		form.Add(fileContent, "file", "receipt.png");

		return await _client.PostAsync($"/api/organizations/{organizationId}/receipts/draft", form);
	}

	private async Task<HttpResponseMessage> ExtractAsync(Guid receiptId, Guid organizationId)
	{
		using var form = new MultipartFormDataContent();
		form.Add(new StringContent(organizationId.ToString()), "organizationId");
		using var fileContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71 });
		fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
		form.Add(fileContent, "file", "receipt.png");

		return await _client.PostAsync($"/api/receipts/{receiptId}/extract", form);
	}

	private async Task<HttpResponseMessage> AddItemPhotoAsync(Guid receiptId)
	{
		using var form = new MultipartFormDataContent();
		using var fileContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71 });
		fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
		form.Add(fileContent, "files", "item-photo.png");

		return await _client.PostAsync($"/api/receipts/{receiptId}/item-photos", form);
	}

	private async Task SeedRegistryCredentialAsync(Guid organizationId, RegistryProvider provider, string rawApiKey)
	{
		using var scope = _factory.Services.CreateScope();
		var credentialService = scope.ServiceProvider.GetRequiredService<IRegistryCredentialService>();

		var actorId = await ResolveAdminDomainUserIdAsync();
		var response = await credentialService.UpsertOrganizationKeyAsync(organizationId, actorId, provider, rawApiKey, CancellationToken.None);
		Assert.True(response.IsSuccess);
	}

	private async Task<Guid> ResolveAdminDomainUserIdAsync()
	{
		using var scope = _factory.Services.CreateScope();
		var db = scope.ServiceProvider.GetRequiredService<ProzoroBanka.Infrastructure.Data.ApplicationDbContext>();
		var user = await db.DomainUsers.FirstAsync(u => u.Email == "admin@example.com");
		return user.Id;
	}

	private async Task<Guid> CreateOrganizationAsync(string name)
	{
		var response = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name,
			description = "Receipts integration org",
			website = "https://test.example.org",
			contactEmail = "test@example.org"
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
			firstName = "Receipt",
			lastName = "Member",
			turnstileToken = "test-token"
		});
		response.EnsureSuccessStatusCode();
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
