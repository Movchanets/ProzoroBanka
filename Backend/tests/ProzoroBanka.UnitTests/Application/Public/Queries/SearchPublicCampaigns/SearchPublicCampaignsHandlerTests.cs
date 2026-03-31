using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Public.Queries.SearchPublicCampaigns;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Public.Queries.SearchPublicCampaigns;

[Collection("PostgreSQL")]
public class SearchPublicCampaignsHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public SearchPublicCampaignsHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private static Mock<IFileStorage> CreateFileStorage()
	{
		var fileStorage = new Mock<IFileStorage>();
		fileStorage
			.Setup(x => x.GetPublicUrl(It.IsAny<string>()))
			.Returns<string>(storageKey => $"https://local/{storageKey}");

		return fileStorage;
	}

	private async Task<(Campaign VerifiedCampaign, Campaign ActiveCampaign, Campaign CompletedCampaign)> SeedCampaignsAsync(
		ApplicationDbContext db,
		string scope)
	{
		var owner1 = Guid.NewGuid();
		var owner2 = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = owner1, Email = $"{owner1:N}@test.com", FirstName = "Owner", LastName = "One" },
			new User { Id = owner2, Email = $"{owner2:N}@test.com", FirstName = "Owner", LastName = "Two" });

		var verifiedOrg = new Organization
		{
			Id = Guid.NewGuid(),
			Name = $"{scope} Verified Org",
			Slug = $"{scope}-verified-org",
			OwnerUserId = owner1,
			IsVerified = true
		};
		var regularOrg = new Organization
		{
			Id = Guid.NewGuid(),
			Name = $"{scope} Response Org",
			Slug = $"{scope}-response-org",
			OwnerUserId = owner2,
			IsVerified = false
		};

		db.Organizations.AddRange(verifiedOrg, regularOrg);

		var verifiedCampaign = new Campaign
		{
			Id = Guid.NewGuid(),
			OrganizationId = verifiedOrg.Id,
			CreatedByUserId = owner1,
			Title = $"{scope} Verified Campaign",
			Description = "Trusted support stream",
			GoalAmount = 1000,
			CurrentAmount = 400,
			Status = CampaignStatus.Active
		};

		var activeCampaign = new Campaign
		{
			Id = Guid.NewGuid(),
			OrganizationId = regularOrg.Id,
			CreatedByUserId = owner2,
			Title = $"{scope} Frontline Campaign",
			Description = $"{scope} emergency response",
			GoalAmount = 2000,
			CurrentAmount = 1500,
			Status = CampaignStatus.Active
		};

		var completedCampaign = new Campaign
		{
			Id = Guid.NewGuid(),
			OrganizationId = regularOrg.Id,
			CreatedByUserId = owner2,
			Title = $"{scope} Archive Campaign",
			Description = "Completed archive run",
			GoalAmount = 1500,
			CurrentAmount = 1400,
			Status = CampaignStatus.Completed
		};

		db.Campaigns.AddRange(verifiedCampaign, activeCampaign, completedCampaign);
		await db.SaveChangesAsync();

		return (verifiedCampaign, activeCampaign, completedCampaign);
	}

	[Fact]
	public async Task Handle_FiltersVerifiedCampaigns_WhenFilterEnabled()
	{
		await using var db = _fixture.CreateContext();
		var scope = $"verified-{Guid.NewGuid():N}";
		var (verifiedCampaign, _, _) = await SeedCampaignsAsync(db, scope);
		var handler = new SearchPublicCampaignsHandler(db, CreateFileStorage().Object);

		var result = await handler.Handle(
			new SearchPublicCampaignsQuery(scope, VerifiedOnly: true),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Single(result.Payload!.Items);
		Assert.Equal(verifiedCampaign.Id, result.Payload.Items[0].Id);
		Assert.True(result.Payload.Items[0].OrganizationVerified);
	}

	[Fact]
	public async Task Handle_SearchesAcrossCampaignAndOrganizationFields()
	{
		await using var db = _fixture.CreateContext();
		var scope = $"search-{Guid.NewGuid():N}";
		var (verifiedCampaign, activeCampaign, _) = await SeedCampaignsAsync(db, scope);
		var handler = new SearchPublicCampaignsHandler(db, CreateFileStorage().Object);

		var byTitle = await handler.Handle(new SearchPublicCampaignsQuery($"{scope} Verified"), CancellationToken.None);
		var byDescription = await handler.Handle(new SearchPublicCampaignsQuery($"{scope} emergency response"), CancellationToken.None);
		var byOrganization = await handler.Handle(new SearchPublicCampaignsQuery($"{scope} Response Org"), CancellationToken.None);

		Assert.Contains(byTitle.Payload!.Items, item => item.Id == verifiedCampaign.Id);
		Assert.Contains(byDescription.Payload!.Items, item => item.Id == activeCampaign.Id);
		Assert.Contains(byOrganization.Payload!.Items, item => item.Id == activeCampaign.Id);
	}

	[Fact]
	public async Task Handle_SortsActiveCampaigns_ByRaisedAmountDescending()
	{
		await using var db = _fixture.CreateContext();
		var scope = $"sort-{Guid.NewGuid():N}";
		var (verifiedCampaign, activeCampaign, completedCampaign) = await SeedCampaignsAsync(db, scope);
		var handler = new SearchPublicCampaignsHandler(db, CreateFileStorage().Object);

		var result = await handler.Handle(new SearchPublicCampaignsQuery(scope), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(activeCampaign.Id, result.Payload!.Items[0].Id);
		Assert.Equal(verifiedCampaign.Id, result.Payload.Items[1].Id);
		Assert.Equal(completedCampaign.Id, result.Payload.Items[2].Id);
	}
}
