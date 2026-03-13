using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Organizations.Commands.DeclineInvitation;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.DeclineInvitation;

[Collection("PostgreSQL")]
public class DeclineInvitationHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public DeclineInvitationHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_DeclinesPendingInvitation_ForLinkBasedInvite()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"tk-dec-{Guid.NewGuid():N}";

		db.DomainUsers.AddRange(
			new User { Id = callerId, Email = $"cal-{callerId:N}@test.com", FirstName = "C", LastName = "L" },
			new User { Id = inviterId, Email = $"inv-{inviterId:N}@test.com", FirstName = "I", LastName = "N" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Decline Org",
			Slug = $"dec-{orgId:N}",
			OwnerUserId = inviterId
		});
		db.Invitations.Add(new Invitation
		{
			OrganizationId = orgId,
			InviterId = inviterId,
			Token = token,
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddDays(1)
		});
		await db.SaveChangesAsync();

		var handler = new DeclineInvitationHandler(db);
		var result = await handler.Handle(
			new DeclineInvitationCommand(callerId, token),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(
			InvitationStatus.Declined,
			(await db.Invitations.IgnoreQueryFilters().FirstAsync(i => i.Token == token)).Status);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenInvitationExpired()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"tk-exp-{Guid.NewGuid():N}";

		db.DomainUsers.AddRange(
			new User { Id = callerId, Email = $"cal-{callerId:N}@test.com", FirstName = "C", LastName = "L" },
			new User { Id = inviterId, Email = $"inv-{inviterId:N}@test.com", FirstName = "I", LastName = "N" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Expiry Org",
			Slug = $"exp-{orgId:N}",
			OwnerUserId = inviterId
		});
		db.Invitations.Add(new Invitation
		{
			OrganizationId = orgId,
			InviterId = inviterId,
			Token = token,
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddMinutes(-10)
		});
		await db.SaveChangesAsync();

		var handler = new DeclineInvitationHandler(db);
		var result = await handler.Handle(
			new DeclineInvitationCommand(callerId, token),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Термін дії", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenEmailMismatch_ForEmailInvite()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"tk-email-{Guid.NewGuid():N}";

		db.DomainUsers.AddRange(
			new User { Id = callerId, Email = "wrong-email@test.com", FirstName = "W", LastName = "E" },
			new User { Id = inviterId, Email = $"inv-{inviterId:N}@test.com", FirstName = "I", LastName = "N" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Email Org",
			Slug = $"email-org-{orgId:N}",
			OwnerUserId = inviterId
		});
		db.Invitations.Add(new Invitation
		{
			OrganizationId = orgId,
			InviterId = inviterId,
			Email = "expected@test.com", // email-based invite for a specific address
			Token = token,
			DefaultRole = OrganizationRole.Reporter,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddDays(1)
		});
		await db.SaveChangesAsync();

		var handler = new DeclineInvitationHandler(db);
		var result = await handler.Handle(
			new DeclineInvitationCommand(callerId, token),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("іншого", result.Message);
	}
}
