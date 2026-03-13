using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Organizations.Commands.LeaveOrganization;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.LeaveOrganization;

[Collection("PostgreSQL")]
public class LeaveOrganizationHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public LeaveOrganizationHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenOwnerTriesToLeave()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = ownerId,
			Email = $"owner-{ownerId:N}@test.com",
			FirstName = "Owner",
			LastName = "User"
		});
		// SaveChangesAsync auto-creates Owner member with all permissions
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Leave Org",
			Slug = $"leave-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		var handler = new LeaveOrganizationHandler(db);
		var result = await handler.Handle(
			new LeaveOrganizationCommand(ownerId, orgId),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Власник", result.Message);
	}

	[Fact]
	public async Task Handle_SuccessfullyLeaves_WhenNonOwnerMember()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var memberId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"owner-{ownerId:N}@test.com", FirstName = "O", LastName = "W" },
			new User { Id = memberId, Email = $"mbr-{memberId:N}@test.com", FirstName = "M", LastName = "B" }
		);
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Member Org",
			Slug = $"mbr-org-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync(); // auto-creates owner member

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = memberId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.ManageReceipts,
			JoinedAt = DateTime.UtcNow
		});
		await db.SaveChangesAsync();

		var handler = new LeaveOrganizationHandler(db);
		var result = await handler.Handle(
			new LeaveOrganizationCommand(memberId, orgId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);

		// Member is soft-deleted — query filter hides it, so use IgnoreQueryFilters
		var softDeleted = await db.OrganizationMembers
			.IgnoreQueryFilters()
			.FirstOrDefaultAsync(m => m.UserId == memberId && m.OrganizationId == orgId);
		Assert.NotNull(softDeleted);
		Assert.True(softDeleted.IsDeleted);
	}
}
