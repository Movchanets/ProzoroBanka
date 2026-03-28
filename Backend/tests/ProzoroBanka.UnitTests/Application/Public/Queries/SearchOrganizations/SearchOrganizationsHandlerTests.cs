using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Public.Queries.SearchOrganizations;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Public.Queries.SearchOrganizations;

[Collection("PostgreSQL")]
public class SearchOrganizationsHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public SearchOrganizationsHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_ReturnsOnlyVerified_WhenFilterEnabled()
	{
		await using var db = _fixture.CreateContext();

		var owner1 = Guid.NewGuid();
		var owner2 = Guid.NewGuid();
		db.DomainUsers.AddRange(
			new User { Id = owner1, Email = $"{owner1:N}@test.com", FirstName = "A", LastName = "A" },
			new User { Id = owner2, Email = $"{owner2:N}@test.com", FirstName = "B", LastName = "B" });

		db.Organizations.AddRange(
			new Organization { Id = Guid.NewGuid(), Name = "Verified Org", Slug = $"verified-{Guid.NewGuid():N}", OwnerUserId = owner1, IsVerified = true },
			new Organization { Id = Guid.NewGuid(), Name = "Regular Org", Slug = $"regular-{Guid.NewGuid():N}", OwnerUserId = owner2, IsVerified = false });

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(s => $"https://local/{s}");

		var handler = new SearchOrganizationsHandler(db, fileStorage.Object);
		var result = await handler.Handle(new SearchOrganizationsQuery(null, 1, 12, VerifiedOnly: true), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Single(result.Payload!.Items);
		Assert.True(result.Payload.Items[0].IsVerified);
	}

	[Fact]
	public async Task Handle_ReturnsOnlyWithActiveCampaign_WhenActiveOnlyEnabled()
	{
		await using var db = _fixture.CreateContext();

		var owner = Guid.NewGuid();
		db.DomainUsers.Add(new User { Id = owner, Email = $"{owner:N}@test.com", FirstName = "Owner", LastName = "Test" });

		var activeOrg = new Organization
		{
			Id = Guid.NewGuid(),
			Name = "Active Org",
			Slug = $"active-{Guid.NewGuid():N}",
			OwnerUserId = owner
		};
		var inactiveOrg = new Organization
		{
			Id = Guid.NewGuid(),
			Name = "Inactive Org",
			Slug = $"inactive-{Guid.NewGuid():N}",
			OwnerUserId = owner
		};

		db.Organizations.AddRange(activeOrg, inactiveOrg);
		db.Campaigns.Add(new Campaign
		{
			Id = Guid.NewGuid(),
			OrganizationId = activeOrg.Id,
			CreatedByUserId = owner,
			Title = "Active",
			GoalAmount = 1000,
			CurrentAmount = 100,
			Status = CampaignStatus.Active
		});
		db.Campaigns.Add(new Campaign
		{
			Id = Guid.NewGuid(),
			OrganizationId = inactiveOrg.Id,
			CreatedByUserId = owner,
			Title = "Draft",
			GoalAmount = 1000,
			CurrentAmount = 0,
			Status = CampaignStatus.Draft
		});

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		var handler = new SearchOrganizationsHandler(db, fileStorage.Object);
		var result = await handler.Handle(new SearchOrganizationsQuery(null, 1, 12, ActiveOnly: true), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Contains(result.Payload!.Items, item => item.Slug == activeOrg.Slug);
		Assert.All(result.Payload.Items, item => Assert.True(item.ActiveCampaignCount > 0));
	}
}
