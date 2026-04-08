using Moq;
using ProzoroBanka.Application.Campaigns.Commands.ChangeCampaignStatus;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Campaigns.Commands.ChangeCampaignStatus;

[Collection("PostgreSQL")]
public class ChangeCampaignStatusHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public ChangeCampaignStatusHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private async Task<(Guid UserId, Guid OrgId, Guid CampaignId)> SeedCampaignAsync(
		ApplicationDbContext db, CampaignStatus status = CampaignStatus.Draft, long goalAmount = 10000)
	{
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"user-{userId:N}@test.com",
			FirstName = "Test",
			LastName = "User"
		});
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Test Org",
			Slug = $"test-org-{orgId:N}",
			OwnerUserId = userId
		});

		var campaign = new Campaign
		{
			OrganizationId = orgId,
			CreatedByUserId = userId,
			Title = "Тестовий збір",
			GoalAmount = goalAmount,
			Status = status
		};
		db.Campaigns.Add(campaign);
		await db.SaveChangesAsync();

		return (userId, orgId, campaign.Id);
	}

	private Mock<IOrganizationAuthorizationService> SetupAuth(Guid orgId, Guid userId, bool hasPermission = true)
	{
		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(hasPermission);
		return orgAuth;
	}

	[Fact]
	public async Task Handle_DraftToActive_Success()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedCampaignAsync(db, CampaignStatus.Draft, 10000);
		var orgAuth = SetupAuth(orgId, userId);

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(userId, campaignId, CampaignStatus.Active),
			CancellationToken.None);

		Assert.True(result.IsSuccess);

		var updated = await db.Campaigns.FindAsync(campaignId);
		Assert.Equal(CampaignStatus.Active, updated!.Status);
		Assert.NotNull(updated.StartDate);
	}

	[Fact]
	public async Task Handle_DraftToActive_FailsWhenGoalAmountZero()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedCampaignAsync(db, CampaignStatus.Draft, 0);
		var orgAuth = SetupAuth(orgId, userId);

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(userId, campaignId, CampaignStatus.Active),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("ціль", result.Message);
	}

	[Fact]
	public async Task Handle_ActiveToPaused_Success()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedCampaignAsync(db, CampaignStatus.Active);
		var orgAuth = SetupAuth(orgId, userId);

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(userId, campaignId, CampaignStatus.Paused),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
	}

	[Fact]
	public async Task Handle_ActiveToCompleted_Success()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedCampaignAsync(db, CampaignStatus.Active);
		var orgAuth = SetupAuth(orgId, userId);

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(userId, campaignId, CampaignStatus.Completed),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
	}

	[Fact]
	public async Task Handle_PausedToActive_Success()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedCampaignAsync(db, CampaignStatus.Paused);
		var orgAuth = SetupAuth(orgId, userId);

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(userId, campaignId, CampaignStatus.Active),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
	}

	[Theory]
	[InlineData(CampaignStatus.Completed, CampaignStatus.Active)]
	[InlineData(CampaignStatus.Completed, CampaignStatus.Paused)]
	[InlineData(CampaignStatus.Completed, CampaignStatus.Draft)]
	[InlineData(CampaignStatus.Draft, CampaignStatus.Paused)]
	[InlineData(CampaignStatus.Draft, CampaignStatus.Completed)]
	[InlineData(CampaignStatus.Paused, CampaignStatus.Completed)]
	[InlineData(CampaignStatus.Paused, CampaignStatus.Draft)]
	public async Task Handle_InvalidTransition_ReturnsFailure(CampaignStatus from, CampaignStatus to)
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedCampaignAsync(db, from);
		var orgAuth = SetupAuth(orgId, userId);

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(userId, campaignId, to),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Неможливий перехід", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenCampaignNotFound()
	{
		await using var db = _fixture.CreateContext();
		var orgAuth = new Mock<IOrganizationAuthorizationService>();

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(Guid.NewGuid(), Guid.NewGuid(), CampaignStatus.Active),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("не знайдено", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenNoPermission()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedCampaignAsync(db, CampaignStatus.Draft);
		var orgAuth = SetupAuth(orgId, userId, false);

		var handler = new ChangeCampaignStatusHandler(db, orgAuth.Object);
		var result = await handler.Handle(
			new ChangeCampaignStatusCommand(userId, campaignId, CampaignStatus.Active),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Недостатньо прав", result.Message);
	}
}
