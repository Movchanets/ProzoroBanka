using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using ProzoroBanka.Application.Contracts.Email;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Identity;
using ProzoroBanka.Infrastructure.Services;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Infrastructure.Services;

[Collection("PostgreSQL")]
public class UserServiceTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UserServiceTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task RegisterAsync_CreatesDomainUser_AndLinksIdentityUser()
	{
		await using var db = _fixture.CreateContext();
		var email = $"register-{Guid.NewGuid():N}@test.com";
		var createdIdentityUserId = Guid.NewGuid();

		var userManagerMock = CreateUserManagerMock();
		userManagerMock
			.Setup(manager => manager.FindByEmailAsync(email))
			.ReturnsAsync((ApplicationUser?)null);
		userManagerMock
			.Setup(manager => manager.CreateAsync(It.IsAny<ApplicationUser>(), "Password123!"))
			.ReturnsAsync((ApplicationUser user, string _) =>
			{
				user.Id = createdIdentityUserId;
				return IdentityResult.Success;
			});
		userManagerMock
			.Setup(manager => manager.AddToRoleAsync(It.IsAny<ApplicationUser>(), ApplicationRoles.Volunteer))
			.ReturnsAsync(IdentityResult.Success);
		userManagerMock
			.Setup(manager => manager.GetRolesAsync(It.IsAny<ApplicationUser>()))
			.ReturnsAsync([ApplicationRoles.Volunteer]);

		var roleManagerMock = CreateRoleManagerMock();
		roleManagerMock
			.Setup(manager => manager.FindByNameAsync(ApplicationRoles.Volunteer))
			.ReturnsAsync(new RoleEntity
			{
				Id = Guid.NewGuid(),
				Name = ApplicationRoles.Volunteer,
				Description = "Волонтер"
			});
		roleManagerMock
			.Setup(manager => manager.GetClaimsAsync(It.IsAny<RoleEntity>()))
			.ReturnsAsync([
				new System.Security.Claims.Claim("permission", "receipts.read"),
				new System.Security.Claims.Claim("permission", "receipts.create"),
				new System.Security.Claims.Claim("permission", "receipts.update"),
				new System.Security.Claims.Claim("permission", "receipts.delete"),
				new System.Security.Claims.Claim("permission", "monobank.read")
			]);

		var tokenServiceMock = new Mock<ITokenService>();
		tokenServiceMock
			.Setup(service => service.GenerateTokensAsync(
				createdIdentityUserId,
				email,
				It.IsAny<IList<string>>(),
				It.IsAny<IList<string>>(),
				It.IsAny<string?>(),
				It.IsAny<CancellationToken>()))
			.ReturnsAsync(new TokenResponse(
				"access-token",
				"refresh-token",
				DateTime.UtcNow.AddMinutes(15),
				DateTime.UtcNow.AddDays(7)));

		var service = CreateService(
			db,
			userManagerMock,
			roleManagerMock,
			tokenServiceMock);

		var result = await service.RegisterAsync(email, "Password123!", "Test", "Volunteer", CancellationToken.None);

		Assert.True(result.IsSuccess);
		var domainUser = await db.DomainUsers.SingleAsync(user => user.Email == email);
		Assert.Equal("Test", domainUser.FirstName);
		Assert.Equal("Volunteer", domainUser.LastName);
		Assert.Equal(createdIdentityUserId, domainUser.IdentityUserId);
	}

	[Fact]
	public async Task DeleteUserAsync_TransfersOwnershipAcrossMultipleOrganizations_ToNextJoinedMember()
	{
		var deletedIdentityUserId = Guid.NewGuid();
		var deletedDomainUserId = Guid.NewGuid();
		var adminMemberId = Guid.NewGuid();
		var volunteerMemberId = Guid.NewGuid();
		var orgWithAdminId = Guid.NewGuid();
		var orgWithVolunteerId = Guid.NewGuid();

		await using (var seedDb = _fixture.CreateContext())
		{
			seedDb.DomainUsers.AddRange(
				new User { Id = deletedDomainUserId, IdentityUserId = deletedIdentityUserId, Email = $"owner-{deletedDomainUserId:N}@test.com", FirstName = "Owner", LastName = "User" },
				new User { Id = adminMemberId, Email = $"admin-{adminMemberId:N}@test.com", FirstName = "Admin", LastName = "Member" },
				new User { Id = volunteerMemberId, Email = $"vol-{volunteerMemberId:N}@test.com", FirstName = "Volunteer", LastName = "Member" }
			);

			seedDb.Organizations.AddRange(
				new Organization
				{
					Id = orgWithAdminId,
					Name = "Org Admin Crown",
					Slug = $"org-admin-{orgWithAdminId:N}",
					OwnerUserId = deletedDomainUserId
				},
				new Organization
				{
					Id = orgWithVolunteerId,
					Name = "Org Volunteer Crown",
					Slug = $"org-vol-{orgWithVolunteerId:N}",
					OwnerUserId = deletedDomainUserId
				});
			await seedDb.SaveChangesAsync();

			seedDb.OrganizationMembers.AddRange(
				new OrganizationMember
				{
					OrganizationId = orgWithAdminId,
					UserId = adminMemberId,
					Role = OrganizationRole.Admin,
					PermissionsFlags = OrganizationPermissions.ManageMembers,
					JoinedAt = DateTime.UtcNow.AddDays(-20)
				},
				new OrganizationMember
				{
					OrganizationId = orgWithVolunteerId,
					UserId = volunteerMemberId,
					Role = OrganizationRole.Reporter,
					PermissionsFlags = OrganizationPermissions.ManageReceipts,
					JoinedAt = DateTime.UtcNow.AddDays(-10)
				});
			await seedDb.SaveChangesAsync();
		}

		await using var db = _fixture.CreateContext();

		var userManagerMock = CreateUserManagerMock();
		userManagerMock
			.Setup(manager => manager.FindByIdAsync(deletedIdentityUserId.ToString()))
			.ReturnsAsync(new ApplicationUser
			{
				Id = deletedIdentityUserId,
				Email = $"owner-{deletedDomainUserId:N}@test.com",
				DomainUserId = deletedDomainUserId
			});
		userManagerMock
			.Setup(manager => manager.GetUsersInRoleAsync(ApplicationRoles.Admin))
			.ReturnsAsync([]);

		var service = CreateService(db, userManagerMock);

		var result = await service.DeleteUserAsync(deletedIdentityUserId, CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.False(await db.DomainUsers.AnyAsync(user => user.Id == deletedDomainUserId));

		var orgWithAdmin = await db.Organizations.Include(org => org.Members)
			.SingleAsync(org => org.Id == orgWithAdminId);
		Assert.Equal(adminMemberId, orgWithAdmin.OwnerUserId);
		var promotedAdmin = orgWithAdmin.Members.Single(member => member.UserId == adminMemberId);
		Assert.Equal(OrganizationRole.Owner, promotedAdmin.Role);
		Assert.Equal(OrganizationPermissions.All, promotedAdmin.PermissionsFlags);

		var orgWithVolunteer = await db.Organizations.Include(org => org.Members)
			.SingleAsync(org => org.Id == orgWithVolunteerId);
		Assert.Equal(volunteerMemberId, orgWithVolunteer.OwnerUserId);
		var promotedVolunteer = orgWithVolunteer.Members.Single(member => member.UserId == volunteerMemberId);
		Assert.Equal(OrganizationRole.Owner, promotedVolunteer.Role);
		Assert.Equal(OrganizationPermissions.All, promotedVolunteer.PermissionsFlags);
	}

	[Fact]
	public async Task DeleteUserAsync_AssignsOrganizationToSystemAdministrator_WhenNoOtherMembersExist()
	{
		var deletedIdentityUserId = Guid.NewGuid();
		var deletedDomainUserId = Guid.NewGuid();
		var systemAdminIdentityUserId = Guid.NewGuid();
		var systemAdminDomainUserId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		await using (var seedDb = _fixture.CreateContext())
		{
			seedDb.DomainUsers.AddRange(
				new User { Id = deletedDomainUserId, IdentityUserId = deletedIdentityUserId, Email = $"owner-{deletedDomainUserId:N}@test.com", FirstName = "Owner", LastName = "User" },
				new User { Id = systemAdminDomainUserId, IdentityUserId = systemAdminIdentityUserId, Email = $"sysadmin-{systemAdminDomainUserId:N}@test.com", FirstName = "System", LastName = "Admin" }
			);

			seedDb.Organizations.Add(new Organization
			{
				Id = orgId,
				Name = "Org Without Members",
				Slug = $"org-no-members-{orgId:N}",
				OwnerUserId = deletedDomainUserId
			});
			await seedDb.SaveChangesAsync();
		}

		await using var db = _fixture.CreateContext();

		var deletedIdentityUser = new ApplicationUser
		{
			Id = deletedIdentityUserId,
			Email = $"owner-{deletedDomainUserId:N}@test.com",
			DomainUserId = deletedDomainUserId
		};

		var systemAdminIdentityUser = new ApplicationUser
		{
			Id = systemAdminIdentityUserId,
			Email = $"sysadmin-{systemAdminDomainUserId:N}@test.com"
		};

		var userManagerMock = CreateUserManagerMock();
		userManagerMock
			.Setup(manager => manager.FindByIdAsync(deletedIdentityUserId.ToString()))
			.ReturnsAsync(deletedIdentityUser);
		userManagerMock
			.Setup(manager => manager.GetUsersInRoleAsync(ApplicationRoles.Admin))
			.ReturnsAsync([systemAdminIdentityUser]);

		var service = CreateService(db, userManagerMock);

		var result = await service.DeleteUserAsync(deletedIdentityUserId, CancellationToken.None);

		Assert.True(result.IsSuccess);
		var organization = await db.Organizations.Include(org => org.Members)
			.SingleAsync(org => org.Id == orgId);
		Assert.Equal(systemAdminDomainUserId, organization.OwnerUserId);
		var systemAdminMember = organization.Members.Single(member => member.UserId == systemAdminDomainUserId);
		Assert.Equal(OrganizationRole.Owner, systemAdminMember.Role);
		Assert.Equal(OrganizationPermissions.All, systemAdminMember.PermissionsFlags);
	}

	[Fact]
	public async Task DeleteUserAsync_WithActiveInvitationsAndCampaigns_ShouldSucceed()
	{
		var deletedIdentityUserId = Guid.NewGuid();
		var deletedDomainUserId = Guid.NewGuid();
		var nextOwnerDomainUserId = Guid.NewGuid();
		var organizationId = Guid.NewGuid();
		var invitationId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();

		await using (var seedDb = _fixture.CreateContext())
		{
			seedDb.DomainUsers.AddRange(
				new User
				{
					Id = deletedDomainUserId,
					IdentityUserId = deletedIdentityUserId,
					Email = $"delete-{deletedDomainUserId:N}@test.com",
					FirstName = "Delete",
					LastName = "Me"
				},
				new User
				{
					Id = nextOwnerDomainUserId,
					Email = $"next-owner-{nextOwnerDomainUserId:N}@test.com",
					FirstName = "Next",
					LastName = "Owner"
				});

			seedDb.Organizations.Add(new Organization
			{
				Id = organizationId,
				Name = "Deletion Regression Org",
				Slug = $"deletion-regression-{organizationId:N}",
				OwnerUserId = deletedDomainUserId
			});
			await seedDb.SaveChangesAsync();

			seedDb.OrganizationMembers.Add(new OrganizationMember
			{
				OrganizationId = organizationId,
				UserId = nextOwnerDomainUserId,
				Role = OrganizationRole.Admin,
				PermissionsFlags = OrganizationPermissions.ManageCampaigns | OrganizationPermissions.ManageInvitations,
				JoinedAt = DateTime.UtcNow.AddDays(-14)
			});

			seedDb.Invitations.Add(new Invitation
			{
				Id = invitationId,
				OrganizationId = organizationId,
				InviterId = deletedDomainUserId,
				Email = $"invite-{Guid.NewGuid():N}@test.com",
				Token = $"invite-token-{Guid.NewGuid():N}",
				DefaultRole = OrganizationRole.Reporter,
				Status = InvitationStatus.Pending,
				ExpiresAt = DateTime.UtcNow.AddDays(7)
			});

			seedDb.Campaigns.Add(new Campaign
			{
				Id = campaignId,
				OrganizationId = organizationId,
				CreatedByUserId = deletedDomainUserId,
				Title = "Deletion Regression Campaign",
				Description = "Campaign linked to deleting user",
				GoalAmount = 10000,
				CurrentAmount = 2500,
				Status = CampaignStatus.Active
			});

			await seedDb.SaveChangesAsync();
		}

		await using var db = _fixture.CreateContext();

		var deletedIdentityUser = new ApplicationUser
		{
			Id = deletedIdentityUserId,
			Email = $"delete-{deletedDomainUserId:N}@test.com",
			DomainUserId = deletedDomainUserId
		};

		var userManagerMock = CreateUserManagerMock();
		userManagerMock
			.Setup(manager => manager.FindByIdAsync(deletedIdentityUserId.ToString()))
			.ReturnsAsync(deletedIdentityUser);
		userManagerMock
			.Setup(manager => manager.GetUsersInRoleAsync(ApplicationRoles.Admin))
			.ReturnsAsync([]);

		var service = CreateService(db, userManagerMock);

		var result = await service.DeleteUserAsync(deletedIdentityUserId, CancellationToken.None);

		Assert.True(result.IsSuccess);
		userManagerMock.Verify(manager => manager.DeleteAsync(It.Is<ApplicationUser>(user => user.Id == deletedIdentityUserId)), Times.Once);
		Assert.False(await db.DomainUsers.AnyAsync(user => user.Id == deletedDomainUserId));
		Assert.False(await db.Invitations.AnyAsync(invitation => invitation.Id == invitationId));

		var campaign = await db.Campaigns.SingleAsync(entity => entity.Id == campaignId);
		Assert.Equal(nextOwnerDomainUserId, campaign.CreatedByUserId);

		var organization = await db.Organizations.Include(org => org.Members)
			.SingleAsync(org => org.Id == organizationId);
		Assert.Equal(nextOwnerDomainUserId, organization.OwnerUserId);

		var promotedMember = organization.Members.Single(member => member.UserId == nextOwnerDomainUserId);
		Assert.Equal(OrganizationRole.Owner, promotedMember.Role);
		Assert.Equal(OrganizationPermissions.All, promotedMember.PermissionsFlags);
	}

	private static Mock<UserManager<ApplicationUser>> CreateUserManagerMock()
	{
		var store = new Mock<IUserStore<ApplicationUser>>();
		var mock = new Mock<UserManager<ApplicationUser>>(
			store.Object,
			null!,
			null!,
			null!,
			null!,
			null!,
			null!,
			null!,
			null!);
		mock
			.Setup(manager => manager.DeleteAsync(It.IsAny<ApplicationUser>()))
			.ReturnsAsync(IdentityResult.Success);
		return mock;
	}

	private static Mock<SignInManager<ApplicationUser>> CreateSignInManagerMock(Mock<UserManager<ApplicationUser>> userManagerMock)
	{
		return new Mock<SignInManager<ApplicationUser>>(
			userManagerMock.Object,
			new Mock<IHttpContextAccessor>().Object,
			new Mock<IUserClaimsPrincipalFactory<ApplicationUser>>().Object,
			null!,
			null!,
			null!,
			null!);
	}

	private static Mock<RoleManager<RoleEntity>> CreateRoleManagerMock()
	{
		return new Mock<RoleManager<RoleEntity>>(
			new Mock<IRoleStore<RoleEntity>>().Object,
			null!,
			null!,
			null!,
			null!);
	}

	private static UserService CreateService(
		IApplicationDbContext db,
		Mock<UserManager<ApplicationUser>>? userManagerMock = null,
		Mock<RoleManager<RoleEntity>>? roleManagerMock = null,
		Mock<ITokenService>? tokenServiceMock = null)
	{
		var effectiveUserManager = userManagerMock ?? CreateUserManagerMock();
		var effectiveRoleManager = roleManagerMock ?? CreateRoleManagerMock();
		var effectiveTokenService = tokenServiceMock ?? new Mock<ITokenService>();

		return new UserService(
			effectiveUserManager.Object,
			CreateSignInManagerMock(effectiveUserManager).Object,
			effectiveRoleManager.Object,
			effectiveTokenService.Object,
			new Mock<IEmailNotificationService>().Object,
			new Mock<IFileStorage>().Object,
			db,
			new Mock<IGoogleTokenValidator>().Object,
			new Mock<ILogger<UserService>>().Object);
	}
}
