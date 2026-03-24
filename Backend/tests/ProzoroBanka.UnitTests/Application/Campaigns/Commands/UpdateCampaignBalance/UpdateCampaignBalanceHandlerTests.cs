using Microsoft.Extensions.Logging;
using Moq;
using ProzoroBanka.Application.Campaigns.Commands.UpdateCampaignBalance;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Campaigns.Commands.UpdateCampaignBalance;

[Collection("PostgreSQL")]
public class UpdateCampaignBalanceHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UpdateCampaignBalanceHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private async Task<(Guid UserId, Guid OrgId, Guid CampaignId)> SeedAsync(
		ApplicationDbContext db, decimal initialAmount = 0m)
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
			Title = "Test Campaign",
			GoalAmount = 50000m,
			CurrentAmount = initialAmount,
			Status = CampaignStatus.Active
		};
		db.Campaigns.Add(campaign);
		await db.SaveChangesAsync();

		return (userId, orgId, campaign.Id);
	}

	[Fact]
	public async Task Handle_UpdatesBalance_AndCreatesTransaction()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedAsync(db, 1000m);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var logger = new Mock<ILogger<UpdateCampaignBalanceHandler>>();

		var handler = new UpdateCampaignBalanceHandler(db, orgAuth.Object, logger.Object);
		var result = await handler.Handle(
			new UpdateCampaignBalanceCommand(userId, campaignId, 5000m, "Тестове оновлення"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);

		var updated = await db.Campaigns.FindAsync(campaignId);
		Assert.Equal(5000m, updated!.CurrentAmount);

		var tx = db.CampaignTransactions.FirstOrDefault(t => t.CampaignId == campaignId);
		Assert.NotNull(tx);
		Assert.Equal(4000m, tx.Amount); // delta: 5000 - 1000
		Assert.Equal(BalanceUpdateSource.Manual, tx.Source);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenCampaignNotFound()
	{
		await using var db = _fixture.CreateContext();

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		var logger = new Mock<ILogger<UpdateCampaignBalanceHandler>>();

		var handler = new UpdateCampaignBalanceHandler(db, orgAuth.Object, logger.Object);
		var result = await handler.Handle(
			new UpdateCampaignBalanceCommand(Guid.NewGuid(), Guid.NewGuid(), 100m, null),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("не знайдено", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenNoPermission()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedAsync(db);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		var logger = new Mock<ILogger<UpdateCampaignBalanceHandler>>();

		var handler = new UpdateCampaignBalanceHandler(db, orgAuth.Object, logger.Object);
		var result = await handler.Handle(
			new UpdateCampaignBalanceCommand(userId, campaignId, 100m, null),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Недостатньо прав", result.Message);
	}
}
