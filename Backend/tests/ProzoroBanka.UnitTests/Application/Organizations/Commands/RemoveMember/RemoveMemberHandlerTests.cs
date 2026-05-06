using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Services;
using ProzoroBanka.Application.Organizations.Commands.RemoveMember;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.RemoveMember;

[Collection("PostgreSQL")]
public class RemoveMemberHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public RemoveMemberHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_SuccessfullyRemovesMember_WhenCallerHasManageMembers()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var callerId = Guid.NewGuid();
		var targetId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = callerId, Email = $"cal-{callerId:N}@test.com", FirstName = "C", LastName = "L" },
			new User { Id = targetId, Email = $"tgt-{targetId:N}@test.com", FirstName = "T", LastName = "G" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Remove Org A",
			Slug = $"remove-a-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.AddRange(
			new OrganizationMember
			{
				OrganizationId = orgId,
				UserId = callerId,
				Role = OrganizationRole.Admin,
				PermissionsFlags = OrganizationPermissions.ManageMembers,
				JoinedAt = DateTime.UtcNow
			},
			new OrganizationMember
			{
				OrganizationId = orgId,
				UserId = targetId,
				Role = OrganizationRole.Reporter,
				PermissionsFlags = OrganizationPermissions.None,
				JoinedAt = DateTime.UtcNow
			}
		);
		await db.SaveChangesAsync();

		var handler = new RemoveMemberHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new RemoveMemberCommand(callerId, orgId, targetId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Contains("Учасника видалено", result.Message);

		var softDeleted = await db.OrganizationMembers
			.IgnoreQueryFilters()
			.FirstOrDefaultAsync(m => m.UserId == targetId && m.OrganizationId == orgId);
		Assert.NotNull(softDeleted);
		Assert.True(softDeleted.IsDeleted);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenCallerLacksManageMembersPermission()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var callerId = Guid.NewGuid();
		var targetId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = callerId, Email = $"cal-{callerId:N}@test.com", FirstName = "C", LastName = "L" },
			new User { Id = targetId, Email = $"tgt-{targetId:N}@test.com", FirstName = "T", LastName = "G" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Remove Org B",
			Slug = $"remove-b-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.AddRange(
			new OrganizationMember
			{
				OrganizationId = orgId,
				UserId = callerId,
				Role = OrganizationRole.Reporter,
				PermissionsFlags = OrganizationPermissions.None,
				JoinedAt = DateTime.UtcNow
			},
			new OrganizationMember
			{
				OrganizationId = orgId,
				UserId = targetId,
				Role = OrganizationRole.Reporter,
				PermissionsFlags = OrganizationPermissions.None,
				JoinedAt = DateTime.UtcNow
			}
		);
		await db.SaveChangesAsync();

		var handler = new RemoveMemberHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new RemoveMemberCommand(callerId, orgId, targetId),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		// Note: The OrganizationAuthorizationService returns its own failure message if access fails
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenTargetNotFound()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var nonExistentTargetId = Guid.NewGuid();

		db.DomainUsers.Add(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Remove Org C",
			Slug = $"remove-c-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		var handler = new RemoveMemberHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new RemoveMemberCommand(ownerId, orgId, nonExistentTargetId),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("не знайдено", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenTryingToRemoveOwner()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var callerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = callerId, Email = $"cal-{callerId:N}@test.com", FirstName = "C", LastName = "L" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Remove Org D",
			Slug = $"remove-d-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = callerId,
			Role = OrganizationRole.Admin,
			PermissionsFlags = OrganizationPermissions.ManageMembers,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var handler = new RemoveMemberHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new RemoveMemberCommand(callerId, orgId, ownerId),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("власника", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenTryingToRemoveSelf()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var callerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = callerId, Email = $"cal-{callerId:N}@test.com", FirstName = "C", LastName = "L" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Remove Org E",
			Slug = $"remove-e-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = callerId,
			Role = OrganizationRole.Admin,
			PermissionsFlags = OrganizationPermissions.ManageMembers,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var handler = new RemoveMemberHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new RemoveMemberCommand(callerId, orgId, callerId),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("відповідний endpoint", result.Message);
	}
}
