using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Services;
using ProzoroBanka.Application.Organizations.Commands.CancelInvitation;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.CancelInvitation;

[Collection("PostgreSQL")]
public class CancelInvitationHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public CancelInvitationHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_CancelsInvitation_WhenCallerIsTheInviter()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid(); // org owner, also the inviter
		var orgId = Guid.NewGuid();
		var inviteId = Guid.NewGuid();

		db.DomainUsers.Add(new User
			{ Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" });
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Cancel Org A",
			Slug = $"can-a-{orgId:N}",
			OwnerUserId = ownerId
		});
		db.Invitations.Add(new Invitation
		{
			Id = inviteId,
			OrganizationId = orgId,
			InviterId = ownerId,
			Token = $"tk-can-a-{inviteId:N}",
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddDays(1)
		});
		await db.SaveChangesAsync();

		var handler = new CancelInvitationHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new CancelInvitationCommand(ownerId, orgId, inviteId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(
			InvitationStatus.Cancelled,
			(await db.Invitations.IgnoreQueryFilters().FirstAsync(i => i.Id == inviteId)).Status);
	}

	[Fact]
	public async Task Handle_CancelsInvitation_WhenCallerHasManageInvitationsPermission()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid(); // org owner — auto-gets ManageInvitations via Owner role
		var inviterId = Guid.NewGuid(); // different user who created the invitation
		var orgId = Guid.NewGuid();
		var inviteId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = inviterId, Email = $"inv-{inviterId:N}@test.com", FirstName = "I", LastName = "N" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Cancel Org B",
			Slug = $"can-b-{orgId:N}",
			OwnerUserId = ownerId
		});
		db.Invitations.Add(new Invitation
		{
			Id = inviteId,
			OrganizationId = orgId,
			InviterId = inviterId, // different user created the invite
			Token = $"tk-can-b-{inviteId:N}",
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddDays(1)
		});
		await db.SaveChangesAsync(); // auto-creates Owner member for ownerId with ALL permissions

		// Owner (ownerId) cancels inviterId's invitation — HasPermission(ManageInvitations) =  true for Owner
		var handler = new CancelInvitationHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new CancelInvitationCommand(ownerId, orgId, inviteId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenCallerHasNoPermissionAndIsNotInviter()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var unauthorizedCallerId = Guid.NewGuid(); // non-member, not the inviter
		var orgId = Guid.NewGuid();
		var inviteId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"own-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = inviterId, Email = $"inv-{inviterId:N}@test.com", FirstName = "I", LastName = "N" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Cancel Org C",
			Slug = $"can-c-{orgId:N}",
			OwnerUserId = ownerId
		});
		db.Invitations.Add(new Invitation
		{
			Id = inviteId,
			OrganizationId = orgId,
			InviterId = inviterId,
			Token = $"tk-can-c-{inviteId:N}",
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddDays(1)
		});
		await db.SaveChangesAsync();

		// unauthorizedCallerId is not a member and not the inviter
		var handler = new CancelInvitationHandler(db, new OrganizationAuthorizationService(db));
		var result = await handler.Handle(
			new CancelInvitationCommand(unauthorizedCallerId, orgId, inviteId),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Недостатньо прав", result.Message);
	}
}
