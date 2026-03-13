using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Services;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.UnitTests.Application.Common.Services;

public class OrganizationAuthorizationServiceTests
{
	[Fact]
	public async Task HasPermission_ReturnsTrue_ForOwnerRegardlessOfFlag()
	{
		await using var db = CreateDb();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = userId,
			Role = OrganizationRole.Owner,
			PermissionsFlags = OrganizationPermissions.None,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var service = new OrganizationAuthorizationService(db);

		var result = await service.HasPermission(orgId, userId, OrganizationPermissions.ManageInvitations);

		Assert.True(result);
	}

	[Fact]
	public async Task HasRole_ReturnsFalse_WhenRoleBelowRequirement()
	{
		await using var db = CreateDb();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = userId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.ManageReceipts,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var service = new OrganizationAuthorizationService(db);

		var result = await service.HasRole(orgId, userId, OrganizationRole.Admin);

		Assert.False(result);
	}

	private static ApplicationDbContext CreateDb()
	{
		var options = new DbContextOptionsBuilder<ApplicationDbContext>()
			.UseInMemoryDatabase($"org-auth-{Guid.NewGuid():N}")
			.Options;
		return new ApplicationDbContext(options);
	}
}
