using ProzoroBanka.Application.Common.Services;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Common.Services;

[Collection("PostgreSQL")]
public class OrganizationAuthorizationServiceTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public OrganizationAuthorizationServiceTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task IsMember_ReturnsFalse_ForSoftDeletedMembership()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"owner-{ownerId:N}@test.com", FirstName = "Own", LastName = "Er" },
			new User { Id = userId, Email = $"user-{userId:N}@test.com", FirstName = "Us", LastName = "Er" });

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Auth Org",
			Slug = $"auth-org-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = userId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.ViewReports,
			JoinedAt = DateTime.UtcNow,
			IsDeleted = true
		});
		await db.SaveChangesAsync();

		var service = new OrganizationAuthorizationService(db);

		var isMember = await service.IsMember(orgId, userId, CancellationToken.None);
		var hasPermission = await service.HasPermission(orgId, userId, OrganizationPermissions.ViewReports, CancellationToken.None);

		Assert.False(isMember);
		Assert.False(hasPermission);
	}

	[Fact]
	public async Task HasPermission_ReturnsTrue_ForOwnerRegardlessOfFlag()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		// Satisfy FK constraints: both users must exist in Users table
		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = userId, Email = $"usr-{userId:N}@test.com", FirstName = "U", LastName = "S" }
		);
		// SaveChangesAsync auto-creates an Owner member for ownerId
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Auth Org",
			Slug = $"auth-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		// Add userId as Owner with NO permissions to verify "Owner bypasses flag check"
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
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = userId, Email = $"usr-{userId:N}@test.com", FirstName = "U", LastName = "S" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Role Org",
			Slug = $"role-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

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

	[Fact]
	public async Task EnsureOrganizationAccessAsync_ReturnsFailure_WhenOrganizationIsBlocked_ForManagedOperations()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = userId, Email = $"usr-{userId:N}@test.com", FirstName = "U", LastName = "S" }
		);

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Blocked Org",
			Slug = $"blocked-{orgId:N}",
			OwnerUserId = ownerId,
			IsBlocked = true,
			BlockReason = "policy violation",
			BlockedAtUtc = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = userId,
			Role = OrganizationRole.Admin,
			PermissionsFlags = OrganizationPermissions.ManageOrganization | OrganizationPermissions.ManageMembers,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var service = new OrganizationAuthorizationService(db);
		var accessResult = await service.EnsureOrganizationAccessAsync(
			orgId,
			userId,
			requiredPermission: OrganizationPermissions.ManageOrganization,
			ct: CancellationToken.None);

		Assert.False(accessResult.IsSuccess);
		Assert.Equal("Організацію заблоковано. Зміни заборонені.", accessResult.Message);
	}

	[Fact]
	public async Task EnsureOrganizationAccessAsync_ReturnsSuccess_WhenOrganizationIsBlocked_ButOnlyReadContextRequested()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = userId, Email = $"usr-{userId:N}@test.com", FirstName = "U", LastName = "S" }
		);

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Blocked Read Org",
			Slug = $"blocked-read-{orgId:N}",
			OwnerUserId = ownerId,
			IsBlocked = true,
			BlockReason = "investigation",
			BlockedAtUtc = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = userId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.ViewReports,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var service = new OrganizationAuthorizationService(db);
		var accessResult = await service.EnsureOrganizationAccessAsync(
			orgId,
			userId,
			requiredPermission: null,
			minRole: null,
			ct: CancellationToken.None);

		Assert.True(accessResult.IsSuccess);
		Assert.NotNull(accessResult.Payload);
	}

	[Fact]
	public async Task HasPermission_UsesRoleDefaults_ForZeroMaskReporterMembership()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var reporterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = reporterId, Email = $"rep-{reporterId:N}@test.com", FirstName = "R", LastName = "P" }
		);

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Reporter Zero Mask Org",
			Slug = $"reporter-zero-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = reporterId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.None,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var service = new OrganizationAuthorizationService(db);

		var canManageReceipts = await service.HasPermission(orgId, reporterId, OrganizationPermissions.ManageReceipts, CancellationToken.None);
		var canManagePurchases = await service.HasPermission(orgId, reporterId, OrganizationPermissions.ManagePurchases, CancellationToken.None);
		var canManageReceiptVerification = await service.HasPermission(orgId, reporterId, OrganizationPermissions.ManageReceiptVerification, CancellationToken.None);

		Assert.True(canManageReceipts);
		Assert.True(canManagePurchases);
		Assert.True(canManageReceiptVerification);
	}
}
