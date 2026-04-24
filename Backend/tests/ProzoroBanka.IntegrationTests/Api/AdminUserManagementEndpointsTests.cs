using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.Infrastructure.Identity;

namespace ProzoroBanka.IntegrationTests.Api;

public class AdminUserManagementEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;
	private readonly TestWebApplicationFactory _factory;

	public AdminUserManagementEndpointsTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task SetUserLockout_ByAdmin_LocksAndUnlocksUser()
	{
		await AuthenticateAsAdminAsync();

		var targetEmail = $"lockout-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(targetEmail, "Password123!");

		var userId = await GetUserIdByEmailAsync(targetEmail);

		var lockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/lockout", new
		{
			locked = true
		});

		Assert.Equal(HttpStatusCode.OK, lockResponse.StatusCode);

		var lockedLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = targetEmail,
			password = "Password123!",
			turnstileToken = "test-token"
		});
		Assert.Equal(HttpStatusCode.Unauthorized, lockedLoginResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var unlockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/lockout", new
		{
			locked = false
		});

		Assert.Equal(HttpStatusCode.OK, unlockResponse.StatusCode);

		var unlockedLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = targetEmail,
			password = "Password123!",
			turnstileToken = "test-token"
		});
		Assert.Equal(HttpStatusCode.OK, unlockedLoginResponse.StatusCode);
	}

	[Fact]
	public async Task DeleteUser_ByAdmin_RemovesUserFromAdminList()
	{
		await AuthenticateAsAdminAsync();

		var targetEmail = $"delete-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(targetEmail, "Password123!");

		var userId = await GetUserIdByEmailAsync(targetEmail);

		var deleteResponse = await _client.DeleteAsync($"/api/admin/users/{userId}");
		Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var usersResponse = await _client.GetAsync("/api/admin/users?page=1&pageSize=200");
		usersResponse.EnsureSuccessStatusCode();

		var usersJson = await usersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var users = usersJson.GetProperty("items").EnumerateArray().ToList();
		Assert.DoesNotContain(users, user =>
			string.Equals(user.GetProperty("email").GetString(), targetEmail, StringComparison.OrdinalIgnoreCase));
	}

	[Fact]
	public async Task DeleteUser_ByAdmin_RemovesInvitations_ReassignsCampaigns_AndTransfersOrganization()
	{
		await AuthenticateAsAdminAsync();

		var targetEmail = $"delete-complex-{Guid.NewGuid():N}@example.com";
		var successorEmail = $"delete-successor-{Guid.NewGuid():N}@example.com";

		await RegisterAsync(targetEmail, "Password123!");
		await RegisterAsync(successorEmail, "Password123!");

		var targetUserId = await GetUserIdByEmailAsync(targetEmail);

		Guid targetDomainUserId;
		Guid successorDomainUserId;
		Guid organizationId = Guid.NewGuid();
		Guid invitationId = Guid.NewGuid();
		Guid campaignId = Guid.NewGuid();

		await using (var setupScope = _factory.Services.CreateAsyncScope())
		{
			var db = setupScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
			var userManager = setupScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

			var targetIdentityUser = await userManager.FindByEmailAsync(targetEmail);
			var successorIdentityUser = await userManager.FindByEmailAsync(successorEmail);

			Assert.NotNull(targetIdentityUser);
			Assert.NotNull(successorIdentityUser);
			Assert.NotNull(targetIdentityUser!.DomainUserId);
			Assert.NotNull(successorIdentityUser!.DomainUserId);

			targetDomainUserId = targetIdentityUser.DomainUserId!.Value;
			successorDomainUserId = successorIdentityUser.DomainUserId!.Value;

			db.Organizations.Add(new Organization
			{
				Id = organizationId,
				Name = $"Admin Delete Complex Org {Guid.NewGuid():N}",
				Slug = $"admin-delete-complex-{Guid.NewGuid():N}",
				OwnerUserId = targetDomainUserId
			});
			await db.SaveChangesAsync();

			db.OrganizationMembers.Add(new OrganizationMember
			{
				OrganizationId = organizationId,
				UserId = successorDomainUserId,
				Role = OrganizationRole.Admin,
				PermissionsFlags = OrganizationPermissions.ManageCampaigns | OrganizationPermissions.ManageInvitations,
				JoinedAt = DateTime.UtcNow.AddDays(-30)
			});

			db.Invitations.Add(new Invitation
			{
				Id = invitationId,
				OrganizationId = organizationId,
				InviterId = targetDomainUserId,
				Email = $"pending-{Guid.NewGuid():N}@example.com",
				Token = $"invite-{Guid.NewGuid():N}",
				DefaultRole = OrganizationRole.Reporter,
				Status = InvitationStatus.Pending,
				ExpiresAt = DateTime.UtcNow.AddDays(14)
			});

			db.Campaigns.Add(new Campaign
			{
				Id = campaignId,
				OrganizationId = organizationId,
				CreatedByUserId = targetDomainUserId,
				Title = $"Delete Campaign {Guid.NewGuid():N}",
				Description = "Regression test for admin delete",
				GoalAmount = 25000,
				CurrentAmount = 5000,
				Status = CampaignStatus.Active
			});

			await db.SaveChangesAsync();
		}

		var deleteResponse = await _client.DeleteAsync($"/api/admin/users/{targetUserId}");
		Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var usersResponse = await _client.GetAsync("/api/admin/users?page=1&pageSize=200");
		usersResponse.EnsureSuccessStatusCode();

		var usersJson = await usersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var users = usersJson.GetProperty("items").EnumerateArray().ToList();
		Assert.DoesNotContain(users, user =>
			string.Equals(user.GetProperty("email").GetString(), targetEmail, StringComparison.OrdinalIgnoreCase));

		await using var assertScope = _factory.Services.CreateAsyncScope();
		var assertDb = assertScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		var assertUserManager = assertScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

		Assert.Null(await assertUserManager.FindByIdAsync(targetUserId.ToString()));
		Assert.False(await assertDb.DomainUsers.AnyAsync(user => user.Id == targetDomainUserId));
		Assert.False(await assertDb.Invitations.AnyAsync(invitation => invitation.Id == invitationId));

		var campaign = await assertDb.Campaigns.SingleAsync(entity => entity.Id == campaignId);
		Assert.Equal(successorDomainUserId, campaign.CreatedByUserId);

		var organization = await assertDb.Organizations
			.Include(org => org.Members)
			.SingleAsync(org => org.Id == organizationId);
		Assert.Equal(successorDomainUserId, organization.OwnerUserId);

		var successorMember = organization.Members.Single(member => member.UserId == successorDomainUserId);
		Assert.Equal(OrganizationRole.Owner, successorMember.Role);
		Assert.Equal(OrganizationPermissions.All, successorMember.PermissionsFlags);
	}

	[Fact]
	public async Task UserManagementEndpoints_WithoutAuth_ReturnUnauthorized()
	{
		var randomUserId = Guid.NewGuid();

		var lockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{randomUserId}/lockout", new
		{
			locked = true
		});
		Assert.Equal(HttpStatusCode.Unauthorized, lockResponse.StatusCode);

		var deleteResponse = await _client.DeleteAsync($"/api/admin/users/{randomUserId}");
		Assert.Equal(HttpStatusCode.Unauthorized, deleteResponse.StatusCode);
	}

	[Fact]
	public async Task GetUsers_WithFilters_ReturnsExpectedSubset()
	{
		await AuthenticateAsAdminAsync();

		var unique = Guid.NewGuid().ToString("N")[..8];
		var targetEmail = $"filtered-{unique}@example.com";
		await RegisterAsync(targetEmail, "Password123!");

		var userId = await GetUserIdByEmailAsync(targetEmail);

		var lockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/lockout", new
		{
			locked = true
		});
		lockResponse.EnsureSuccessStatusCode();

		await AuthenticateAsAdminAsync();
		var response = await _client.GetAsync($"/api/admin/users?page=1&pageSize=200&search={Uri.EscapeDataString(unique)}&isActive=false&role=Volunteer");
		response.EnsureSuccessStatusCode();

		var usersJson = await response.Content.ReadFromJsonAsync<JsonElement>();
		var users = usersJson.GetProperty("items").EnumerateArray().ToList();

		Assert.Contains(users, user =>
			string.Equals(user.GetProperty("email").GetString(), targetEmail, StringComparison.OrdinalIgnoreCase));
	}

	[Fact]
	public async Task GetRoles_IncludesModeratorWithImpersonationPermission()
	{
		await AuthenticateAsAdminAsync();

		var response = await _client.GetAsync("/api/admin/roles");
		response.EnsureSuccessStatusCode();

		var json = await response.Content.ReadFromJsonAsync<JsonElement>();
		var roles = json.EnumerateArray().ToList();

		var moderator = roles.Single(role => string.Equals(role.GetProperty("name").GetString(), "Moderator", StringComparison.OrdinalIgnoreCase));
		var moderatorPermissions = moderator.GetProperty("permissions").EnumerateArray().Select(item => item.GetString()).Where(value => value is not null).ToList();

		Assert.Contains("users.impersonate", moderatorPermissions);
		Assert.Contains("users.read", moderatorPermissions);
		Assert.Contains("users.update", moderatorPermissions);
		Assert.Contains("users.delete", moderatorPermissions);
		Assert.Contains("users.manage_roles", moderatorPermissions);

		var admin = roles.Single(role => string.Equals(role.GetProperty("name").GetString(), "Admin", StringComparison.OrdinalIgnoreCase));
		var adminPermissions = admin.GetProperty("permissions").EnumerateArray().Select(item => item.GetString()).Where(value => value is not null).ToList();

		Assert.Contains("system.settings", adminPermissions);
		Assert.Contains("organizations.manage", adminPermissions);
		Assert.Contains("organizations.plan.manage", adminPermissions);
		Assert.DoesNotContain("users.impersonate", adminPermissions);
		Assert.DoesNotContain("users.manage_roles", adminPermissions);
		Assert.DoesNotContain("reports.export", adminPermissions);
		Assert.DoesNotContain("monobank.sync", adminPermissions);
		Assert.DoesNotContain("purchases.manage", adminPermissions);
	}

	[Fact]
	public async Task ImpersonateUser_AsModerator_ReturnsTargetUserTokens()
	{
		await AuthenticateAsAdminAsync();

		var moderatorEmail = $"moderator-{Guid.NewGuid():N}@example.com";
		var targetEmail = $"impersonated-{Guid.NewGuid():N}@example.com";

		await RegisterAsync(moderatorEmail, "Password123!");
		await RegisterAsync(targetEmail, "Password123!");

		var moderatorUserId = await GetUserIdByEmailAsync(moderatorEmail);
		var targetUserId = await GetUserIdByEmailAsync(targetEmail);

		var assignModeratorResponse = await _client.PutAsJsonAsync($"/api/admin/users/{moderatorUserId}/roles", new
		{
			roles = new[] { "Moderator" }
		});
		assignModeratorResponse.EnsureSuccessStatusCode();

		await AuthenticateAsAsync(moderatorEmail, "Password123!");

		var impersonateResponse = await _client.PostAsync($"/api/admin/users/{targetUserId}/impersonate", content: null);
		impersonateResponse.EnsureSuccessStatusCode();

		var tokenJson = await impersonateResponse.Content.ReadFromJsonAsync<JsonElement>();
		var accessToken = tokenJson.GetProperty("accessToken").GetString();
		Assert.False(string.IsNullOrWhiteSpace(accessToken));

		var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken!);
		Assert.Equal(targetEmail, jwt.Claims.Single(claim => claim.Type == System.Security.Claims.ClaimTypes.Email).Value);

		var targetDomainUserId = await GetDomainUserIdByEmailAsync(targetEmail);
		Assert.Equal(targetDomainUserId.ToString(), jwt.Claims.Single(claim => claim.Type == "domain_user_id").Value);
	}

	[Fact]
	public async Task UserDetails_AndMembershipUpdateEndpoints_WorkForAdmin()
	{
		await AuthenticateAsAdminAsync();

		var targetEmail = $"details-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(targetEmail, "Password123!");
		var userId = await GetUserIdByEmailAsync(targetEmail);

		Guid targetDomainUserId;
		Guid organizationId = Guid.NewGuid();

		await using (var setupScope = _factory.Services.CreateAsyncScope())
		{
			var db = setupScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
			var userManager = setupScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
			var targetIdentityUser = await userManager.FindByEmailAsync(targetEmail);
			var adminIdentityUser = await userManager.FindByEmailAsync("admin@example.com");

			Assert.NotNull(targetIdentityUser);
			Assert.NotNull(targetIdentityUser!.DomainUserId);
			Assert.NotNull(adminIdentityUser);
			Assert.NotNull(adminIdentityUser!.DomainUserId);
			targetDomainUserId = targetIdentityUser.DomainUserId!.Value;

			db.Organizations.Add(new Organization
			{
				Id = organizationId,
				Name = $"Details Org {Guid.NewGuid():N}",
				Slug = $"details-org-{Guid.NewGuid():N}",
				OwnerUserId = adminIdentityUser.DomainUserId!.Value
			});
			await db.SaveChangesAsync();

			db.OrganizationMembers.Add(new OrganizationMember
			{
				OrganizationId = organizationId,
				UserId = targetDomainUserId,
				Role = OrganizationRole.Reporter,
				PermissionsFlags = OrganizationPermissions.ManageReceipts,
				JoinedAt = DateTime.UtcNow.AddDays(-5)
			});
			await db.SaveChangesAsync();
		}

		var detailsResponse = await _client.GetAsync($"/api/admin/users/{userId}");
		detailsResponse.EnsureSuccessStatusCode();
		var detailsJson = await detailsResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(targetEmail, detailsJson.GetProperty("email").GetString());
		Assert.Contains(detailsJson.GetProperty("organizations").EnumerateArray(), item => item.GetProperty("organizationId").GetGuid() == organizationId);

		var updateResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/organizations/{organizationId}", new
		{
			role = OrganizationRole.Admin,
			permissions = (int)(OrganizationPermissions.ManageOrganization | OrganizationPermissions.ManageMembers)
		});
		updateResponse.EnsureSuccessStatusCode();

		await using var assertScope = _factory.Services.CreateAsyncScope();
		var assertDb = assertScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		var membership = await assertDb.OrganizationMembers.SingleAsync(entity => entity.OrganizationId == organizationId && entity.UserId == targetDomainUserId);
		Assert.Equal(OrganizationRole.Admin, membership.Role);
		Assert.Equal(OrganizationPermissions.ManageOrganization | OrganizationPermissions.ManageMembers, membership.PermissionsFlags);
	}

	[Fact]
	public async Task UpdateUserOrganizationLink_WhenPermissionsNone_NormalizesToReporterDefaults()
	{
		await AuthenticateAsAdminAsync();

		var targetEmail = $"normalize-admin-link-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(targetEmail, "Password123!");
		var userId = await GetUserIdByEmailAsync(targetEmail);

		Guid targetDomainUserId;
		Guid organizationId = Guid.NewGuid();

		await using (var setupScope = _factory.Services.CreateAsyncScope())
		{
			var db = setupScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
			var userManager = setupScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
			var targetIdentityUser = await userManager.FindByEmailAsync(targetEmail);
			var adminIdentityUser = await userManager.FindByEmailAsync("admin@example.com");

			Assert.NotNull(targetIdentityUser);
			Assert.NotNull(targetIdentityUser!.DomainUserId);
			Assert.NotNull(adminIdentityUser);
			Assert.NotNull(adminIdentityUser!.DomainUserId);
			targetDomainUserId = targetIdentityUser.DomainUserId!.Value;

			db.Organizations.Add(new Organization
			{
				Id = organizationId,
				Name = $"Normalize Link Org {Guid.NewGuid():N}",
				Slug = $"normalize-link-org-{Guid.NewGuid():N}",
				OwnerUserId = adminIdentityUser.DomainUserId!.Value
			});
			await db.SaveChangesAsync();

			db.OrganizationMembers.Add(new OrganizationMember
			{
				OrganizationId = organizationId,
				UserId = targetDomainUserId,
				Role = OrganizationRole.Admin,
				PermissionsFlags = OrganizationPermissions.All,
				JoinedAt = DateTime.UtcNow.AddDays(-3)
			});
			await db.SaveChangesAsync();
		}

		var updateResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/organizations/{organizationId}", new
		{
			role = OrganizationRole.Reporter,
			permissions = (int)OrganizationPermissions.None
		});
		updateResponse.EnsureSuccessStatusCode();

		var updatedLink = await updateResponse.Content.ReadFromJsonAsync<JsonElement>();
		var expectedReporterDefaults = OrganizationRolePermissions.GetDefaultPermissions(OrganizationRole.Reporter);
		Assert.Equal((int)expectedReporterDefaults, updatedLink.GetProperty("permissions").GetInt32());

		await using var assertScope = _factory.Services.CreateAsyncScope();
		var assertDb = assertScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		var membership = await assertDb.OrganizationMembers.SingleAsync(entity => entity.OrganizationId == organizationId && entity.UserId == targetDomainUserId);
		Assert.Equal(OrganizationRole.Reporter, membership.Role);
		Assert.Equal(expectedReporterDefaults, membership.PermissionsFlags);
	}

	[Fact]
	public async Task UpdateUserLimitsSettings_ChangesGlobalNonAdminOrganizationLimit()
	{
		await AuthenticateAsAdminAsync();

		var updateResponse = await _client.PutAsJsonAsync("/api/admin/settings/users", new
		{
			maxOwnedOrganizationsForNonAdmin = 12
		});
		updateResponse.EnsureSuccessStatusCode();

		var getResponse = await _client.GetAsync("/api/admin/settings/users");
		getResponse.EnsureSuccessStatusCode();
		var json = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(12, json.GetProperty("maxOwnedOrganizationsForNonAdmin").GetInt32());
	}

	[Fact]
	public async Task AdminGeneralSettingsEndpoints_UpdateAndReturnOwnedAndJoinedLimits()
	{
		await AuthenticateAsAdminAsync();

		var updateResponse = await _client.PutAsJsonAsync("/api/admin/settings/general", new
		{
			maxOwnedOrganizationsForNonAdmin = 15,
			maxJoinedOrganizationsForNonAdmin = 30
		});
		updateResponse.EnsureSuccessStatusCode();

		var getResponse = await _client.GetAsync("/api/admin/settings/general");
		getResponse.EnsureSuccessStatusCode();
		var json = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(15, json.GetProperty("maxOwnedOrganizationsForNonAdmin").GetInt32());
		Assert.Equal(30, json.GetProperty("maxJoinedOrganizationsForNonAdmin").GetInt32());
	}

	[Fact]
	public async Task AdminPlansSettingsEndpoints_UpdateAndReturnFreeAndPaidLimits()
	{
		await AuthenticateAsAdminAsync();

		var updateResponse = await _client.PutAsJsonAsync("/api/admin/settings/plans", new
		{
			free = new
			{
				maxCampaigns = 4,
				maxMembers = 12,
				maxOcrExtractionsPerMonth = 150
			},
			paid = new
			{
				maxCampaigns = 120,
				maxMembers = 250,
				maxOcrExtractionsPerMonth = 6000
			}
		});
		updateResponse.EnsureSuccessStatusCode();

		var getResponse = await _client.GetAsync("/api/admin/settings/plans");
		getResponse.EnsureSuccessStatusCode();
		var json = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
		Assert.Equal(4, json.GetProperty("free").GetProperty("maxCampaigns").GetInt32());
		Assert.Equal(12, json.GetProperty("free").GetProperty("maxMembers").GetInt32());
		Assert.Equal(150, json.GetProperty("free").GetProperty("maxOcrExtractionsPerMonth").GetInt32());
		Assert.Equal(120, json.GetProperty("paid").GetProperty("maxCampaigns").GetInt32());
		Assert.Equal(250, json.GetProperty("paid").GetProperty("maxMembers").GetInt32());
		Assert.Equal(6000, json.GetProperty("paid").GetProperty("maxOcrExtractionsPerMonth").GetInt32());
	}

	private async Task RegisterAsync(string email, string password)
	{
		var response = await _client.PostAsJsonAsync("/api/auth/register", new
		{
			email,
			password,
			confirmPassword = password,
			firstName = "Admin",
			lastName = "Managed",
			turnstileToken = "test-token"
		});

		response.EnsureSuccessStatusCode();
	}

	private async Task<Guid> GetUserIdByEmailAsync(string email)
	{
		var usersResponse = await _client.GetAsync("/api/admin/users?page=1&pageSize=200");
		usersResponse.EnsureSuccessStatusCode();

		var usersJson = await usersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var users = usersJson.GetProperty("items").EnumerateArray();

		var user = users.FirstOrDefault(item =>
			string.Equals(item.GetProperty("email").GetString(), email, StringComparison.OrdinalIgnoreCase));

		Assert.True(user.ValueKind != JsonValueKind.Undefined, $"User with email '{email}' was not found in admin users list.");
		return user.GetProperty("id").GetGuid();
	}

	private async Task<Guid> GetDomainUserIdByEmailAsync(string email)
	{
		await using var scope = _factory.Services.CreateAsyncScope();
		var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

		return await db.DomainUsers
			.Where(user => user.Email == email)
			.Select(user => user.Id)
			.SingleAsync();
	}

	private async Task AuthenticateAsAdminAsync()
	{
		await AuthenticateAsAsync("admin@example.com", "Admin123!ChangeMe");
	}

	private async Task AuthenticateAsAsync(string email, string password)
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
