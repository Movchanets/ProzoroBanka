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

	private async Task<HttpResponseMessage> UploadDraftAsync()
	{
		using var form = new MultipartFormDataContent();
		using var fileContent = new ByteArrayContent(new byte[] { 137, 80, 78, 71 });
		fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
		form.Add(fileContent, "file", "receipt.png");

		return await _client.PostAsync("/api/receipts/draft", form);
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
