using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Organizations.Commands.AcceptInvitation;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.AcceptInvitation;

[Collection("PostgreSQL")]
public class AcceptInvitationHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public AcceptInvitationHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_AcceptsPendingInvitation_AndCreatesMember()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"token-acc-{Guid.NewGuid():N}";

		db.DomainUsers.AddRange(
			new User { Id = callerId, Email = $"vol-{callerId:N}@example.com", FirstName = "V", LastName = "One" },
			new User { Id = inviterId, Email = $"adm-{inviterId:N}@example.com", FirstName = "A", LastName = "Two" }
		);
		// Unique slug per test to avoid unique-constraint collision on shared DB
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = $"org-{orgId:N}", OwnerUserId = inviterId });
		db.Invitations.Add(new Invitation
		{
			OrganizationId = orgId,
			InviterId = inviterId,
			Token = token,
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddHours(2)
		});
		await db.SaveChangesAsync();

		var handler = new AcceptInvitationHandler(db);
		var result = await handler.Handle(new AcceptInvitationCommand(callerId, token), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.True(await db.OrganizationMembers.AnyAsync(m => m.OrganizationId == orgId && m.UserId == callerId));
		Assert.Equal(
			InvitationStatus.Accepted,
			(await db.Invitations.FirstAsync(i => i.Token == token)).Status);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenInvitationExpired()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var expiredToken = $"exp-{Guid.NewGuid():N}";

		// Both users must exist — Organization.OwnerUserId and Invitation.InviterId are FKs to Users
		db.DomainUsers.AddRange(
			new User { Id = callerId, Email = $"vol-{callerId:N}@example.com", FirstName = "V", LastName = "One" },
			new User { Id = inviterId, Email = $"adm-{inviterId:N}@example.com", FirstName = "A", LastName = "Two" }
		);
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = $"org-{orgId:N}", OwnerUserId = inviterId });
		db.Invitations.Add(new Invitation
		{
			OrganizationId = orgId,
			InviterId = inviterId,
			Token = expiredToken,
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddMinutes(-5)
		});
		await db.SaveChangesAsync();

		var handler = new AcceptInvitationHandler(db);
		var result = await handler.Handle(new AcceptInvitationCommand(callerId, expiredToken), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Термін дії", result.Message);
	}
}
