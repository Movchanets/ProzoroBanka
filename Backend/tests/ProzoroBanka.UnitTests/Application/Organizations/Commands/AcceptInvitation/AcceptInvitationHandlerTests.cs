using Microsoft.EntityFrameworkCore;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.Commands.AcceptInvitation;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Services;
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

		var handler = CreateHandler(db);
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

		var handler = CreateHandler(db);
		var result = await handler.Handle(new AcceptInvitationCommand(callerId, expiredToken), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Термін дії", result.Message);
	}

	[Fact]
	public async Task Handle_AllowsOnlyOneSuccessfulAccept_WhenRequestsAreConcurrent()
	{
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"token-concurrent-{Guid.NewGuid():N}";

		// Seed once.
		await using (var seedDb = _fixture.CreateContext())
		{
			seedDb.DomainUsers.AddRange(
				new User { Id = callerId, Email = $"vol-{callerId:N}@example.com", FirstName = "V", LastName = "One" },
				new User { Id = inviterId, Email = $"adm-{inviterId:N}@example.com", FirstName = "A", LastName = "Two" }
			);

			seedDb.Organizations.Add(new Organization
			{
				Id = orgId,
				Name = "Concurrent Accept Org",
				Slug = $"concurrent-accept-org-{orgId:N}",
				OwnerUserId = inviterId
			});

			seedDb.Invitations.Add(new Invitation
			{
				OrganizationId = orgId,
				InviterId = inviterId,
				Token = token,
				DefaultRole = OrganizationRole.Reporter,
				Status = InvitationStatus.Pending,
				ExpiresAt = DateTime.UtcNow.AddHours(2)
			});

			await seedDb.SaveChangesAsync();
		}

		// Two separate contexts simulate two concurrent requests/transactions.
		await using var db1 = _fixture.CreateContext();
		await using var db2 = _fixture.CreateContext();

		var handler1 = CreateHandler(db1);
		var handler2 = CreateHandler(db2);

		var task1 = handler1.Handle(new AcceptInvitationCommand(callerId, token), CancellationToken.None);
		var task2 = handler2.Handle(new AcceptInvitationCommand(callerId, token), CancellationToken.None);

		var results = await Task.WhenAll(task1, task2);
		Assert.Equal(1, results.Count(r => r.IsSuccess));
		Assert.Equal(1, results.Count(r => !r.IsSuccess));

		await using var verifyDb = _fixture.CreateContext();
		var invitation = await verifyDb.Invitations.FirstAsync(i => i.Token == token);
		Assert.Equal(InvitationStatus.Accepted, invitation.Status);

		var memberCount = await verifyDb.OrganizationMembers
			.CountAsync(m => m.OrganizationId == orgId && m.UserId == callerId && !m.IsDeleted);
		Assert.Equal(1, memberCount);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenFreePlanMemberLimitReached_AndKeepsInvitationPending()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"token-limit-free-{Guid.NewGuid():N}";

		var users = new List<User>
		{
			new() { Id = callerId, Email = $"vol-{callerId:N}@example.com", FirstName = "V", LastName = "One" },
			new() { Id = inviterId, Email = $"adm-{inviterId:N}@example.com", FirstName = "A", LastName = "Two" }
		};

		for (var i = 0; i < 10; i++)
		{
			var id = Guid.NewGuid();
			users.Add(new User { Id = id, Email = $"member-{id:N}@example.com", FirstName = "M", LastName = $"{i}" });
		}

		db.DomainUsers.AddRange(users);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Free Limit Org",
			Slug = $"free-limit-org-{orgId:N}",
			OwnerUserId = inviterId,
			PlanType = OrganizationPlanType.Free
		});

		foreach (var user in users.Skip(2))
		{
			db.OrganizationMembers.Add(new OrganizationMember
			{
				OrganizationId = orgId,
				UserId = user.Id,
				Role = OrganizationRole.Reporter,
				PermissionsFlags = OrganizationPermissions.ViewReports,
				JoinedAt = DateTime.UtcNow
			});
		}

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

		var handler = CreateHandler(db);
		var result = await handler.Handle(new AcceptInvitationCommand(callerId, token), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("ліміт", result.Message, StringComparison.OrdinalIgnoreCase);
		Assert.Equal(
			InvitationStatus.Pending,
			(await db.Invitations.FirstAsync(i => i.Token == token)).Status);
		Assert.False(await db.OrganizationMembers.AnyAsync(m => m.OrganizationId == orgId && m.UserId == callerId));
	}

	[Fact]
	public async Task Handle_AcceptsInvitation_WhenPaidPlanHasCapacity()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"token-limit-paid-{Guid.NewGuid():N}";

		var users = new List<User>
		{
			new() { Id = callerId, Email = $"vol-{callerId:N}@example.com", FirstName = "V", LastName = "One" },
			new() { Id = inviterId, Email = $"adm-{inviterId:N}@example.com", FirstName = "A", LastName = "Two" }
		};

		for (var i = 0; i < 10; i++)
		{
			var id = Guid.NewGuid();
			users.Add(new User { Id = id, Email = $"member-paid-{id:N}@example.com", FirstName = "P", LastName = $"{i}" });
		}

		db.DomainUsers.AddRange(users);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Paid Limit Org",
			Slug = $"paid-limit-org-{orgId:N}",
			OwnerUserId = inviterId,
			PlanType = OrganizationPlanType.Paid
		});

		foreach (var user in users.Skip(2))
		{
			db.OrganizationMembers.Add(new OrganizationMember
			{
				OrganizationId = orgId,
				UserId = user.Id,
				Role = OrganizationRole.Reporter,
				PermissionsFlags = OrganizationPermissions.ViewReports,
				JoinedAt = DateTime.UtcNow
			});
		}

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

		var handler = CreateHandler(db);
		var result = await handler.Handle(new AcceptInvitationCommand(callerId, token), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.True(await db.OrganizationMembers.AnyAsync(m => m.OrganizationId == orgId && m.UserId == callerId));
		Assert.Equal(
			InvitationStatus.Accepted,
			(await db.Invitations.FirstAsync(i => i.Token == token)).Status);
	}

	[Fact]
	public async Task Handle_ReactivatesSoftDeletedMembership_InsteadOfCreatingDuplicate()
	{
		await using var db = _fixture.CreateContext();
		var callerId = Guid.NewGuid();
		var inviterId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var token = $"token-reactivate-{Guid.NewGuid():N}";

		db.DomainUsers.AddRange(
			new User { Id = callerId, Email = $"vol-{callerId:N}@example.com", FirstName = "V", LastName = "One" },
			new User { Id = inviterId, Email = $"adm-{inviterId:N}@example.com", FirstName = "A", LastName = "Two" }
		);

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Reactivate Org",
			Slug = $"reactivate-org-{orgId:N}",
			OwnerUserId = inviterId
		});

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = callerId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.ViewReports,
			JoinedAt = DateTime.UtcNow.AddDays(-30),
			IsDeleted = true
		});

		db.Invitations.Add(new Invitation
		{
			OrganizationId = orgId,
			InviterId = inviterId,
			Token = token,
			DefaultRole = OrganizationRole.Admin,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddHours(2)
		});

		await db.SaveChangesAsync();

		var beforeCount = await db.OrganizationMembers
			.IgnoreQueryFilters()
			.CountAsync(m => m.OrganizationId == orgId && m.UserId == callerId);

		var handler = CreateHandler(db);
		var result = await handler.Handle(new AcceptInvitationCommand(callerId, token), CancellationToken.None);

		Assert.True(result.IsSuccess);

		var afterCount = await db.OrganizationMembers
			.IgnoreQueryFilters()
			.CountAsync(m => m.OrganizationId == orgId && m.UserId == callerId);
		Assert.Equal(beforeCount, afterCount);

		var restored = await db.OrganizationMembers
			.IgnoreQueryFilters()
			.SingleAsync(m => m.OrganizationId == orgId && m.UserId == callerId);
		Assert.False(restored.IsDeleted);
		Assert.Equal(OrganizationRole.Admin, restored.Role);
		var expectedAdminPermissions = OrganizationPermissions.ManageOrganization
			| OrganizationPermissions.ManageMembers
			| OrganizationPermissions.ManageInvitations
			| OrganizationPermissions.ManageReceipts
			| OrganizationPermissions.ViewReports
			| OrganizationPermissions.UploadLogo
			| OrganizationPermissions.ManageCampaigns;
		Assert.Equal(expectedAdminPermissions, restored.PermissionsFlags);
	}

	private static AcceptInvitationHandler CreateHandler(ProzoroBanka.Infrastructure.Data.ApplicationDbContext db)
	{
		var settings = new Mock<ISystemSettingsService>();
		settings.Setup(x => x.GetMaxJoinedOrganizationsForNonAdminAsync(It.IsAny<CancellationToken>())).ReturnsAsync(20);
		settings.Setup(x => x.GetPlanLimitsAsync(OrganizationPlanType.Free, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new OrganizationPlanLimits
			{
				MaxCampaigns = 3,
				MaxMembers = 10,
				MaxOcrExtractionsPerMonth = 100
			});
		settings.Setup(x => x.GetPlanLimitsAsync(OrganizationPlanType.Paid, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new OrganizationPlanLimits
			{
				MaxCampaigns = 100,
				MaxMembers = 200,
				MaxOcrExtractionsPerMonth = 5000
			});

		var currentUser = new Mock<ICurrentUserService>();
		currentUser.SetupGet(x => x.IsAdmin).Returns(false);

		return new AcceptInvitationHandler(db, new UnitOfWork(db), settings.Object, currentUser.Object);
	}
}
