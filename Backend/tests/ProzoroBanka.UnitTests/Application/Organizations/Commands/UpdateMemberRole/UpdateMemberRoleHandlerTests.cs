using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Services;
using ProzoroBanka.Application.Organizations.Commands.UpdateMemberRole;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.UpdateMemberRole;

[Collection("PostgreSQL")]
public class UpdateMemberRoleHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UpdateMemberRoleHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_UpdatesRole_WhenCallerHasManageMembers()
	{
		await using var db = _fixture.CreateContext();
		var fileStorage = new Mock<IFileStorage>();
		var ownerId = Guid.NewGuid(); // auto-gets ManageMembers via Owner role
		var targetId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = targetId, Email = $"tgt-{targetId:N}@test.com", FirstName = "T", LastName = "G" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Role Org A",
			Slug = $"role-a-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync(); // auto-creates Owner member with OrganizationPermissions.All

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = targetId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.None,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var handler = new UpdateMemberRoleHandler(db, new OrganizationAuthorizationService(db), fileStorage.Object);
		var result = await handler.Handle(
			new UpdateMemberRoleCommand(
				ownerId, orgId, targetId,
				OrganizationRole.Admin,
				OrganizationPermissions.ManageReceipts | OrganizationPermissions.ViewReports),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(OrganizationRole.Admin, result.Payload!.Role);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenCallerLacksManageMembersPermission()
	{
		await using var db = _fixture.CreateContext();
		var fileStorage = new Mock<IFileStorage>();
		var ownerId = Guid.NewGuid();
		var callerId = Guid.NewGuid(); // Reporter with no ManageMembers
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
			Name = "Role Org B",
			Slug = $"role-b-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.AddRange(
			new OrganizationMember
			{
				OrganizationId = orgId,
				UserId = callerId,
				Role = OrganizationRole.Reporter,
				PermissionsFlags = OrganizationPermissions.ManageReceipts,
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

		var handler = new UpdateMemberRoleHandler(db, new OrganizationAuthorizationService(db), fileStorage.Object);
		var result = await handler.Handle(
			new UpdateMemberRoleCommand(callerId, orgId, targetId, OrganizationRole.Admin, OrganizationPermissions.None),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Недостатньо прав", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenTargetIsOwner()
	{
		await using var db = _fixture.CreateContext();
		var fileStorage = new Mock<IFileStorage>();
		var ownerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Role Org C",
			Slug = $"role-c-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		// Owner trying to change their own Owner role
		var handler = new UpdateMemberRoleHandler(db, new OrganizationAuthorizationService(db), fileStorage.Object);
		var result = await handler.Handle(
			new UpdateMemberRoleCommand(ownerId, orgId, ownerId, OrganizationRole.Admin, OrganizationPermissions.None),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("власника", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenAssigningOwnerRole()
	{
		await using var db = _fixture.CreateContext();
		var fileStorage = new Mock<IFileStorage>();
		var ownerId = Guid.NewGuid();
		var targetId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = targetId, Email = $"tgt-{targetId:N}@test.com", FirstName = "T", LastName = "G" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Role Org D",
			Slug = $"role-d-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = targetId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.None,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var handler = new UpdateMemberRoleHandler(db, new OrganizationAuthorizationService(db), fileStorage.Object);
		var result = await handler.Handle(
			new UpdateMemberRoleCommand(ownerId, orgId, targetId, OrganizationRole.Owner, OrganizationPermissions.All),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Owner", result.Message);
	}
}
