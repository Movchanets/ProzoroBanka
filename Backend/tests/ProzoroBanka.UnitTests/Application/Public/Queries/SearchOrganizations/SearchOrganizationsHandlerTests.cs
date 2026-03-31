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

	private static Mock<IFileStorage> CreateFileStorage()
	{
		var fileStorage = new Mock<IFileStorage>();
		fileStorage
			.Setup(x => x.GetPublicUrl(It.IsAny<string>()))
			.Returns<string>(s => $"https://local/{s}");

		return fileStorage;
	}

	private async Task<(Organization VerifiedOrg, Organization ActiveOrg, Organization InactiveOrg)> SeedOrganizationsAsync(
		ApplicationDbContext db,
		string scope)
	{
		var owner1 = Guid.NewGuid();
		var owner2 = Guid.NewGuid();
		var owner3 = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = owner1, Email = $"{owner1:N}@test.com", FirstName = "Owner", LastName = "One" },
			new User { Id = owner2, Email = $"{owner2:N}@test.com", FirstName = "Owner", LastName = "Two" },
			new User { Id = owner3, Email = $"{owner3:N}@test.com", FirstName = "Owner", LastName = "Three" });

		var verifiedOrg = new Organization
		{
			Id = Guid.NewGuid(),
			Name = $"{scope} Verified Relief",
			Slug = $"{scope}-verified",
			Description = "Trusted support hub",
			OwnerUserId = owner1,
			IsVerified = true
		};

		var activeOrg = new Organization
		{
			Id = Guid.NewGuid(),
			Name = $"{scope} Frontline Aid",
			Slug = $"{scope}-active",
			Description = $"Collects donations for {scope} emergency response",
			OwnerUserId = owner2,
			IsVerified = false
		};

		var inactiveOrg = new Organization
		{
			Id = Guid.NewGuid(),
			Name = $"{scope} Archive Center",
			Slug = $"{scope}-inactive",
			Description = "Historical initiatives",
			OwnerUserId = owner3,
			IsVerified = false
		};

		db.Organizations.AddRange(verifiedOrg, activeOrg, inactiveOrg);

		db.Campaigns.AddRange(
			new Campaign
			{
				Id = Guid.NewGuid(),
				OrganizationId = verifiedOrg.Id,
				CreatedByUserId = owner1,
				Title = "Verified Support",
				GoalAmount = 1000,
				CurrentAmount = 100,
				Status = CampaignStatus.Active
			},
			new Campaign
			{
				Id = Guid.NewGuid(),
				OrganizationId = activeOrg.Id,
				CreatedByUserId = owner2,
				Title = "Emergency Trucks",
				GoalAmount = 5000,
				CurrentAmount = 2500,
				Status = CampaignStatus.Active
			},
			new Campaign
			{
				Id = Guid.NewGuid(),
				OrganizationId = activeOrg.Id,
				CreatedByUserId = owner2,
				Title = "Field Generators",
				GoalAmount = 4000,
				CurrentAmount = 1500,
				Status = CampaignStatus.Active
			},
			new Campaign
			{
				Id = Guid.NewGuid(),
				OrganizationId = inactiveOrg.Id,
				CreatedByUserId = owner3,
				Title = "Draft Archive",
				GoalAmount = 2000,
				CurrentAmount = 0,
				Status = CampaignStatus.Draft
			});

		await db.SaveChangesAsync();

		return (verifiedOrg, activeOrg, inactiveOrg);
	}

	[Fact]
	public async Task Handle_ReturnsOnlyVerified_WhenFilterEnabled()
	{
		await using var db = _fixture.CreateContext();

		await SeedOrganizationsAsync(db, $"verified-{Guid.NewGuid():N}");

		var handler = new SearchOrganizationsHandler(db, CreateFileStorage().Object);
		var result = await handler.Handle(new SearchOrganizationsQuery(null, 1, 12, VerifiedOnly: true), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotEmpty(result.Payload!.Items);
		Assert.All(result.Payload.Items, item => Assert.True(item.IsVerified));
	}

	[Fact]
	public async Task Handle_ReturnsOnlyWithActiveCampaign_WhenActiveOnlyEnabled()
	{
		await using var db = _fixture.CreateContext();
		var scope = $"active-{Guid.NewGuid():N}";
		var (_, activeOrg, _) = await SeedOrganizationsAsync(db, scope);

		var handler = new SearchOrganizationsHandler(db, CreateFileStorage().Object);
		var result = await handler.Handle(new SearchOrganizationsQuery(scope, 1, 12, ActiveOnly: true), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Contains(result.Payload!.Items, item => item.Slug == activeOrg.Slug);
		Assert.All(result.Payload.Items, item => Assert.True(item.ActiveCampaignCount > 0));
	}

	[Fact]
	public async Task Handle_FindsOrganizations_ByNameDescriptionAndSlug()
	{
		await using var db = _fixture.CreateContext();
		var scope = $"search-{Guid.NewGuid():N}";
		var (verifiedOrg, activeOrg, inactiveOrg) = await SeedOrganizationsAsync(db, scope);
		var handler = new SearchOrganizationsHandler(db, CreateFileStorage().Object);

		var byName = await handler.Handle(
			new SearchOrganizationsQuery($"{scope} Verified", 1, 12),
			CancellationToken.None);
		var byDescription = await handler.Handle(
			new SearchOrganizationsQuery($"{scope} emergency response", 1, 12),
			CancellationToken.None);
		var bySlug = await handler.Handle(
			new SearchOrganizationsQuery($"{scope}-inactive", 1, 12),
			CancellationToken.None);

		Assert.Contains(byName.Payload!.Items, item => item.Id == verifiedOrg.Id);
		Assert.Contains(byDescription.Payload!.Items, item => item.Id == activeOrg.Id);
		Assert.Contains(bySlug.Payload!.Items, item => item.Id == inactiveOrg.Id);
	}

	[Fact]
	public async Task Handle_DefaultSorting_PrioritizesActiveCampaignsOverVerifiedBadge()
	{
		await using var db = _fixture.CreateContext();
		var scope = $"sort-{Guid.NewGuid():N}";
		var (verifiedOrg, activeOrg, _) = await SeedOrganizationsAsync(db, scope);
		var handler = new SearchOrganizationsHandler(db, CreateFileStorage().Object);

		var result = await handler.Handle(new SearchOrganizationsQuery(scope, 1, 12), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(activeOrg.Id, result.Payload!.Items[0].Id);
		Assert.Contains(result.Payload.Items, item => item.Id == verifiedOrg.Id);
	}

	[Fact]
	public async Task Handle_SortsByTotalRaised_WhenRequested()
	{
		await using var db = _fixture.CreateContext();
		var scope = $"raised-{Guid.NewGuid():N}";
		var (verifiedOrg, activeOrg, _) = await SeedOrganizationsAsync(db, scope);
		var handler = new SearchOrganizationsHandler(db, CreateFileStorage().Object);

		var result = await handler.Handle(
			new SearchOrganizationsQuery(scope, 1, 12, SortBy: "totalRaised"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(activeOrg.Id, result.Payload!.Items[0].Id);
		Assert.Contains(result.Payload.Items, item => item.Id == verifiedOrg.Id);
		Assert.True(result.Payload.Items[0].TotalRaised > result.Payload.Items[1].TotalRaised);
	}
}
