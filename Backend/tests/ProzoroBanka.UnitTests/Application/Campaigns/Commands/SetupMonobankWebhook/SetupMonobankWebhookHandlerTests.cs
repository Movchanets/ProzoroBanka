using Microsoft.Extensions.Logging;
using Moq;
using ProzoroBanka.Application.Campaigns.Commands.SetupMonobankWebhook;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Campaigns.Commands.SetupMonobankWebhook;

[Collection("PostgreSQL")]
public class SetupMonobankWebhookHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public SetupMonobankWebhookHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private async Task<(Guid UserId, Guid OrgId, Guid CampaignId)> SeedAsync(ApplicationDbContext db)
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
			Status = CampaignStatus.Active
		};
		db.Campaigns.Add(campaign);
		await db.SaveChangesAsync();

		return (userId, orgId, campaign.Id);
	}

	[Fact]
	public async Task Handle_Success_StoresAccountId_AndSyncsJarBalance()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedAsync(db);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var monobank = new Mock<IMonobankStatelessProxyService>();
		monobank.Setup(x => x.GetClientInfoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<MonobankClientInfoDto>.Success(new MonobankClientInfoDto(
				ClientId: "cid",
				Name: "Test",
				WebHookUrl: null,
				Accounts: [],
				Jars: [new MonobankJarDto("jar-123", "jar/6iKLHCZxKF", "Jar", null, 980, 12345, 50000)])));

		monobank.Setup(x => x.RegisterWebhookAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse.Success("ok"));

		var logger = new Mock<ILogger<SetupMonobankWebhookHandler>>();

		var handler = new SetupMonobankWebhookHandler(db, orgAuth.Object, monobank.Object, logger.Object);
		var result = await handler.Handle(
			new SetupMonobankWebhookCommand(userId, campaignId, "test-token", "jar-123", "https://test.com/webhook"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);

		var updated = await db.Campaigns.FindAsync(campaignId);
		Assert.Equal("jar-123", updated!.MonobankAccountId);
		Assert.Equal("https://send.monobank.ua/jar/6iKLHCZxKF", updated.SendUrl);
		Assert.Equal(12345m, updated.CurrentAmount);
		Assert.Equal(50000m, updated.GoalAmount);

		// Verify token was used only for stateless Monobank calls
		monobank.Verify(x => x.GetClientInfoAsync("test-token", It.IsAny<CancellationToken>()), Times.Once);
		monobank.Verify(x => x.RegisterWebhookAsync("test-token", "https://test.com/webhook", It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	public async Task Handle_WebhookRegistrationFails_DoesNotUpdateCampaign()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedAsync(db);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var monobank = new Mock<IMonobankStatelessProxyService>();
		monobank.Setup(x => x.GetClientInfoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<MonobankClientInfoDto>.Success(new MonobankClientInfoDto(
				ClientId: "cid",
				Name: "Test",
				WebHookUrl: null,
				Accounts: [],
				Jars: [new MonobankJarDto("jar-123", "send", "Jar", null, 980, 12345, 50000)])));

		monobank.Setup(x => x.RegisterWebhookAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse.Failure("Невірний токен"));

		var logger = new Mock<ILogger<SetupMonobankWebhookHandler>>();

		var handler = new SetupMonobankWebhookHandler(db, orgAuth.Object, monobank.Object, logger.Object);
		var result = await handler.Handle(
			new SetupMonobankWebhookCommand(userId, campaignId, "bad-token", "jar-123", "https://test.com/webhook"),
			CancellationToken.None);

		Assert.False(result.IsSuccess);

		var updated = await db.Campaigns.FindAsync(campaignId);
		Assert.Null(updated!.MonobankAccountId);
		Assert.Null(updated.SendUrl);
		Assert.Equal(0m, updated.CurrentAmount);
	}

	[Fact]
	public async Task Handle_SelectedJarMissing_ReturnsFailure_AndDoesNotRegisterWebhook()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedAsync(db);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var monobank = new Mock<IMonobankStatelessProxyService>();
		monobank.Setup(x => x.GetClientInfoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<MonobankClientInfoDto>.Success(new MonobankClientInfoDto(
				ClientId: "cid",
				Name: "Test",
				WebHookUrl: null,
				Accounts: [],
				Jars: [new MonobankJarDto("jar-999", "send", "Jar", null, 980, 12345, 50000)])));

		var logger = new Mock<ILogger<SetupMonobankWebhookHandler>>();

		var handler = new SetupMonobankWebhookHandler(db, orgAuth.Object, monobank.Object, logger.Object);
		var result = await handler.Handle(
			new SetupMonobankWebhookCommand(userId, campaignId, "token", "jar-123", "https://test.com/webhook"),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("не знайдено", result.Message, StringComparison.OrdinalIgnoreCase);

		var updated = await db.Campaigns.FindAsync(campaignId);
		Assert.Null(updated!.MonobankAccountId);
		Assert.Null(updated.SendUrl);
		Assert.Equal(0m, updated.CurrentAmount);

		monobank.Verify(x => x.RegisterWebhookAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenNoPermission()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId, campaignId) = await SeedAsync(db);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		var monobank = new Mock<IMonobankStatelessProxyService>();
		var logger = new Mock<ILogger<SetupMonobankWebhookHandler>>();

		var handler = new SetupMonobankWebhookHandler(db, orgAuth.Object, monobank.Object, logger.Object);
		var result = await handler.Handle(
			new SetupMonobankWebhookCommand(userId, campaignId, "token", "jar", "https://test.com"),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Недостатньо прав", result.Message);

		// Verify Monobank was never called
		monobank.Verify(x => x.GetClientInfoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
		monobank.Verify(x => x.RegisterWebhookAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}
