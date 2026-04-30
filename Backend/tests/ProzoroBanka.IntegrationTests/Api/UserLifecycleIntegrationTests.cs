using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.Infrastructure.Identity;

namespace ProzoroBanka.IntegrationTests.Api;

public class UserLifecycleIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly TestWebApplicationFactory _factory;

	public UserLifecycleIntegrationTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
	}

	[Fact]
	public async Task RegisterAsync_CreatesDomainUser_AndLinksToIdentityUser()
	{
		await using var scope = _factory.Services.CreateAsyncScope();
		var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
		var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

		var email = $"integration-register-{Guid.NewGuid():N}@example.com";

		var result = await userService.RegisterAsync(
			email,
			"Password123!",
			"Integration",
			"User",
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);

		var domainUser = await db.DomainUsers.SingleAsync(user => user.Email == email);
		Assert.Equal("Integration", domainUser.FirstName);
		Assert.Equal("User", domainUser.LastName);
		Assert.NotNull(domainUser.IdentityUserId);

		var identityUser = await db.Users.SingleAsync(user => user.Email == email);
		Assert.Equal(domainUser.Id, identityUser.DomainUserId);
		Assert.Equal(identityUser.Id, domainUser.IdentityUserId);
	}

	[Fact]
	public async Task DeleteUserAsync_ReassignsOrganizations_ToMemberOrSystemAdmin_AndRemovesDomainUser()
	{
		var email = $"integration-delete-{Guid.NewGuid():N}@example.com";
		Guid deletedIdentityUserId;
		Guid deletedDomainUserId;
		Guid orgAdminId = Guid.NewGuid();
		Guid orgVolunteerId = Guid.NewGuid();
		Guid orgFallbackId = Guid.NewGuid();

		await using (var setupScope = _factory.Services.CreateAsyncScope())
		{
			var userService = setupScope.ServiceProvider.GetRequiredService<IUserService>();
			var db = setupScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
			var userManager = setupScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

			var registerResult = await userService.RegisterAsync(
				email,
				"Password123!",
				"Delete",
				"Candidate",
				CancellationToken.None);
			Assert.True(registerResult.IsSuccess);

			var identityUser = await userManager.FindByEmailAsync(email);
			Assert.NotNull(identityUser);

			deletedIdentityUserId = identityUser!.Id;
			deletedDomainUserId = identityUser.DomainUserId!.Value;

			var adminSuccessor = new User
			{
				Email = $"org-admin-{Guid.NewGuid():N}@example.com",
				FirstName = "Admin",
				LastName = "Successor"
			};

			var firstVolunteer = new User
			{
				Email = $"org-volunteer-{Guid.NewGuid():N}@example.com",
				FirstName = "First",
				LastName = "Volunteer"
			};

			db.DomainUsers.AddRange(adminSuccessor, firstVolunteer);
			await db.SaveChangesAsync();

			db.Organizations.AddRange(
				new Organization
				{
					Id = orgAdminId,
					Name = $"Delete Org Admin {Guid.NewGuid():N}",
					Slug = $"delete-admin-{Guid.NewGuid():N}",
					OwnerUserId = deletedDomainUserId
				},
				new Organization
				{
					Id = orgVolunteerId,
					Name = $"Delete Org Volunteer {Guid.NewGuid():N}",
					Slug = $"delete-volunteer-{Guid.NewGuid():N}",
					OwnerUserId = deletedDomainUserId
				},
				new Organization
				{
					Id = orgFallbackId,
					Name = $"Delete Org Fallback {Guid.NewGuid():N}",
					Slug = $"delete-fallback-{Guid.NewGuid():N}",
					OwnerUserId = deletedDomainUserId
				});
			await db.SaveChangesAsync();

			db.OrganizationMembers.AddRange(
				new OrganizationMember
				{
					OrganizationId = orgAdminId,
					UserId = adminSuccessor.Id,
					Role = OrganizationRole.Admin,
					PermissionsFlags = OrganizationPermissions.ManageMembers,
					JoinedAt = DateTime.UtcNow.AddDays(-5)
				},
				new OrganizationMember
				{
					OrganizationId = orgVolunteerId,
					UserId = firstVolunteer.Id,
					Role = OrganizationRole.Reporter,
					PermissionsFlags = OrganizationPermissions.ManageReceipts,
					JoinedAt = DateTime.UtcNow.AddDays(-20)
				});
			await db.SaveChangesAsync();
		}

		await using (var actScope = _factory.Services.CreateAsyncScope())
		{
			var userService = actScope.ServiceProvider.GetRequiredService<IUserService>();
			var deleteResult = await userService.DeleteUserAsync(deletedIdentityUserId, CancellationToken.None);
			Assert.True(deleteResult.IsSuccess);
		}

		await using var assertScope = _factory.Services.CreateAsyncScope();
		var assertDb = assertScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		var userManagerAssert = assertScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

		Assert.False(await assertDb.DomainUsers.AnyAsync(user => user.Id == deletedDomainUserId));

		var orgAdmin = await assertDb.Organizations.Include(org => org.Members)
			.SingleAsync(org => org.Id == orgAdminId);
		var adminOwnerMember = orgAdmin.Members.Single(member => member.UserId == orgAdmin.OwnerUserId);
		Assert.Equal(OrganizationRole.Owner, adminOwnerMember.Role);
		Assert.Equal(OrganizationPermissions.All, adminOwnerMember.PermissionsFlags);

		var orgVolunteer = await assertDb.Organizations.Include(org => org.Members)
			.SingleAsync(org => org.Id == orgVolunteerId);
		var volunteerOwnerMember = orgVolunteer.Members.Single(member => member.UserId == orgVolunteer.OwnerUserId);
		Assert.Equal(OrganizationRole.Owner, volunteerOwnerMember.Role);
		Assert.Equal(OrganizationPermissions.All, volunteerOwnerMember.PermissionsFlags);

		var seededSystemAdmin = await userManagerAssert.FindByEmailAsync("admin@example.com");
		Assert.NotNull(seededSystemAdmin);

		var systemAdminDomainUserId = seededSystemAdmin!.DomainUserId;
		Assert.NotNull(systemAdminDomainUserId);

		var orgFallback = await assertDb.Organizations.Include(org => org.Members)
			.SingleAsync(org => org.Id == orgFallbackId);
		Assert.Equal(systemAdminDomainUserId!.Value, orgFallback.OwnerUserId);

		var systemAdminMember = orgFallback.Members.Single(member => member.UserId == systemAdminDomainUserId.Value);
		Assert.Equal(OrganizationRole.Owner, systemAdminMember.Role);
		Assert.Equal(OrganizationPermissions.All, systemAdminMember.PermissionsFlags);
	}
}