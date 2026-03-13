using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Organizations.Commands.AcceptInvitation;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.AcceptInvitation;

public class AcceptInvitationHandlerTests
{
	[Fact]
	public async Task Handle_AcceptsPendingInvitation_AndCreatesMember()
	{
		await using var db = CreateDb();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = "token-123";

		db.DomainUsers.AddRange(
			new User { Id = callerId, Email = "volunteer@example.com", FirstName = "V", LastName = "One" },
			new User { Id = inviterId, Email = "admin@example.com", FirstName = "A", LastName = "Two" }
		);
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = "org", OwnerUserId = inviterId });
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
		await using var db = CreateDb();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = callerId, Email = "volunteer@example.com", FirstName = "V", LastName = "One" });
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = "org", OwnerUserId = inviterId });
		db.Invitations.Add(new Invitation
		{
			OrganizationId = orgId,
			InviterId = inviterId,
			Token = "expired-token",
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddMinutes(-5)
		});
		await db.SaveChangesAsync();

		var handler = new AcceptInvitationHandler(db);
		var result = await handler.Handle(new AcceptInvitationCommand(callerId, "expired-token"), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Термін дії", result.Message);
	}

	private static ApplicationDbContext CreateDb()
	{
		var options = new DbContextOptionsBuilder<ApplicationDbContext>()
			.UseInMemoryDatabase($"accept-invite-{Guid.NewGuid():N}")
			.Options;
		return new ApplicationDbContext(options);
	}
}
