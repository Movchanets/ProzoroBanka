using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.IntegrationTests.Api;

public class InvitationsEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;
	private readonly TestWebApplicationFactory _factory;

	public InvitationsEndpointsTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task InvitationLink_AcceptFlow_CreatesMembership()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		var publicInviteResponse = await _client.GetAsync($"/api/invitations/{token}");
		Assert.Equal(HttpStatusCode.OK, publicInviteResponse.StatusCode);

		var email = $"invitee-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(email, "Password123!");
		await AuthenticateAsync(email, "Password123!");

		var acceptResponse = await _client.PostAsync($"/api/invitations/{token}/accept", content: null);
		Assert.Equal(HttpStatusCode.NoContent, acceptResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var membersResponse = await _client.GetAsync($"/api/organizations/{orgId}/members");
		Assert.Equal(HttpStatusCode.OK, membersResponse.StatusCode);

		var members = await membersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var joinedMember = members.EnumerateArray().Single(m => m.GetProperty("email").GetString() == email);
		Assert.Equal(
			(int)OrganizationRolePermissions.GetDefaultPermissions(OrganizationRole.Reporter),
			joinedMember.GetProperty("permissionsFlags").GetInt32());

		await using var scope = _factory.Services.CreateAsyncScope();
		var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		var targetUserId = joinedMember.GetProperty("userId").GetGuid();
		var persistedPermissions = await db.OrganizationMembers
			.Where(m => m.OrganizationId == orgId && m.UserId == targetUserId && !m.IsDeleted)
			.Select(m => m.PermissionsFlags)
			.SingleAsync();
		Assert.Equal(OrganizationRolePermissions.GetDefaultPermissions(OrganizationRole.Reporter), persistedPermissions);
	}

	[Fact]
	public async Task AcceptInvitation_WithoutAuth_ReturnsUnauthorized()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		_client.DefaultRequestHeaders.Authorization = null;
		var acceptResponse = await _client.PostAsync($"/api/invitations/{token}/accept", content: null);

		Assert.Equal(HttpStatusCode.Unauthorized, acceptResponse.StatusCode);
	}

	[Fact]
	public async Task DeclineInvitation_ReturnsNoContent()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();
		var token = await CreateInviteLinkAsync(orgId);

		var email = $"decliner-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(email, "Password123!");
		await AuthenticateAsync(email, "Password123!");

		var declineResponse = await _client.PostAsync($"/api/invitations/{token}/decline", content: null);
		Assert.Equal(HttpStatusCode.NoContent, declineResponse.StatusCode);
	}

	[Fact]
	public async Task CancelInvitation_WhenOwner_ReturnsNoContent()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();

		// Create a link invite and capture its ID from the response
		var createLinkResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/invites/link", new
		{
			role = 2,
			expiresInHours = 24
		});
		createLinkResponse.EnsureSuccessStatusCode();
		var inviteJson = await createLinkResponse.Content.ReadFromJsonAsync<JsonElement>();
		var inviteId = inviteJson.GetProperty("id").GetGuid();

		var cancelResponse = await _client.DeleteAsync($"/api/organizations/{orgId}/invites/{inviteId}");
		Assert.Equal(HttpStatusCode.NoContent, cancelResponse.StatusCode);
	}

	[Fact]
	public async Task InviteByEmail_CreatesInvitation_VisibleInOrgInvitesList()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();

		var targetEmail = $"email-invitee-{Guid.NewGuid():N}@example.com";
		var inviteResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/invites/email", new
		{
			email = targetEmail,
			role = 2 // Reporter
		});
		Assert.Equal(HttpStatusCode.OK, inviteResponse.StatusCode);

		var invitesResponse = await _client.GetAsync($"/api/organizations/{orgId}/invites");
		Assert.Equal(HttpStatusCode.OK, invitesResponse.StatusCode);

		var invites = await invitesResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Contains(invites.EnumerateArray(), i => i.GetProperty("email").GetString() == targetEmail);
	}

	[Fact]
	public async Task AcceptInvitation_WhenFreePlanMemberLimitReached_ReturnsBadRequest_AndInvitationStaysPending()
	{
		await AuthenticateAsAdminAsync();
		var orgId = await CreateOrganizationAsync();

		await using (var scope = _factory.Services.CreateAsyncScope())
		{
			var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

			var existingMemberIds = await db.OrganizationMembers
				.Where(m => m.OrganizationId == orgId && !m.IsDeleted)
				.Select(m => m.UserId)
				.ToListAsync();

			for (var i = 0; i < 9; i++)
			{
				var userId = Guid.NewGuid();
				db.DomainUsers.Add(new ProzoroBanka.Domain.Entities.User
				{
					Id = userId,
					Email = $"limit-existing-{userId:N}@example.com",
					FirstName = "Limit",
					LastName = $"{i}"
				});

				db.OrganizationMembers.Add(new ProzoroBanka.Domain.Entities.OrganizationMember
				{
					OrganizationId = orgId,
					UserId = userId,
					Role = OrganizationRole.Reporter,
					PermissionsFlags = OrganizationPermissions.ViewReports,
					JoinedAt = DateTime.UtcNow
				});
			}

			await db.SaveChangesAsync();
		}

		var inviteeEmail = $"limit-invitee-{Guid.NewGuid():N}@example.com";
		var createInviteResponse = await _client.PostAsJsonAsync($"/api/organizations/{orgId}/invites/email", new
		{
			email = inviteeEmail,
			role = 2
		});
		createInviteResponse.EnsureSuccessStatusCode();

		await RegisterAsync(inviteeEmail, "Password123!");
		await AuthenticateAsync(inviteeEmail, "Password123!");

		var invitationsResponse = await _client.GetAsync("/api/invitations/my");
		invitationsResponse.EnsureSuccessStatusCode();
		var invitations = await invitationsResponse.Content.ReadFromJsonAsync<JsonElement>();
		var targetInvitation = invitations.EnumerateArray()
			.First(i => i.GetProperty("organizationId").GetGuid() == orgId);
		var token = targetInvitation.GetProperty("token").GetString()!;

		var acceptResponse = await _client.PostAsync($"/api/invitations/{token}/accept", content: null);
		Assert.Equal(HttpStatusCode.BadRequest, acceptResponse.StatusCode);

		var errorBody = await acceptResponse.Content.ReadAsStringAsync();
		Assert.Contains("ліміт", errorBody, StringComparison.OrdinalIgnoreCase);

		await using var assertScope = _factory.Services.CreateAsyncScope();
		var assertDb = assertScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		var invitationStatus = await assertDb.Invitations
			.Where(i => i.Token == token)
			.Select(i => i.Status)
			.SingleAsync();
		Assert.Equal(InvitationStatus.Pending, invitationStatus);
	}

	private async Task<Guid> CreateOrganizationAsync()
	{
		var response = await _client.PostAsJsonAsync("/api/organizations", new
		{
			name = $"Invite Org {Guid.NewGuid():N}",
			description = "Org for invitation flow",
			website = "https://invite.example.org",
			contactEmail = "invite@example.org"
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
			firstName = "Invited",
			lastName = "User",
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
