using Microsoft.Extensions.Logging;
using Moq;
using ProzoroBanka.Application.Campaigns.Commands.ProcessMonobankWebhook;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Campaigns.Commands.ProcessMonobankWebhook;

[Collection("PostgreSQL")]
public class ProcessMonobankWebhookHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public ProcessMonobankWebhookHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private async Task<(Guid CampaignId, string AccountId)> SeedCampaignAsync(
		ApplicationDbContext db, decimal initialAmount = 0m)
	{
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var accountId = $"account-{Guid.NewGuid():N}";

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
			Status = CampaignStatus.Active,
			MonobankAccountId = accountId
		};
		db.Campaigns.Add(campaign);
		await db.SaveChangesAsync();

		return (campaign.Id, accountId);
	}

	private static MonobankWebhookPayload CreatePayload(
		string accountId, string eventId, long amount, long unixTime = 1554466347)
	{
		return new MonobankWebhookPayload
		{
			Type = "StatementItem",
			Data = new MonobankWebhookData
			{
				Account = accountId,
				StatementItem = new MonobankStatementItem
				{
					Id = eventId,
					Time = unixTime,
					Description = "Покупка",
					Mcc = 7997,
					OriginalMcc = 7997,
					Amount = amount,
					OperationAmount = amount,
					CurrencyCode = 980,
					Balance = 10050000,
					Comment = "Тестовий коментар"
				}
			}
		};
	}

	[Fact]
	public async Task Handle_UpdatesBalance_AndCreatesTransaction()
	{
		await using var db = _fixture.CreateContext();
		var (campaignId, accountId) = await SeedCampaignAsync(db, 1000m);

		var unitOfWork = new Mock<IUnitOfWork>();
		unitOfWork.Setup(x => x.ExecuteInTransactionAsync(It.IsAny<Func<CancellationToken, Task>>(), It.IsAny<CancellationToken>()))
			.Returns<Func<CancellationToken, Task>, CancellationToken>(async (action, ct) => await action(ct));

		var logger = new Mock<ILogger<ProcessMonobankWebhookHandler>>();

		var handler = new ProcessMonobankWebhookHandler(db, unitOfWork.Object, logger.Object);
		var payload = CreatePayload(accountId, "event-001", 50000); // 500 UAH

		var result = await handler.Handle(
			new ProcessMonobankWebhookCommand(payload),
			CancellationToken.None);

		Assert.True(result.IsSuccess);

		var updated = await db.Campaigns.FindAsync(campaignId);
		Assert.Equal(51000m, updated!.CurrentAmount); // 1000 + 50000 (minor units)

		var tx = db.CampaignTransactions.FirstOrDefault(t => t.ExternalTransactionId == "event-001");
		Assert.NotNull(tx);
		Assert.Equal(50000m, tx.Amount);
		Assert.Equal(BalanceUpdateSource.MonobankWebhook, tx.Source);
	}

	[Fact]
	public async Task Handle_DuplicateEvent_IsNoOp()
	{
		await using var db = _fixture.CreateContext();
		var (campaignId, accountId) = await SeedCampaignAsync(db, 1000m);

		// Pre-seed a transaction with the same external ID
		db.CampaignTransactions.Add(new CampaignTransaction
		{
			CampaignId = campaignId,
			ExternalTransactionId = "event-duplicate",
			Amount = 500m,
			TransactionTimeUtc = DateTime.UtcNow,
			Source = BalanceUpdateSource.MonobankWebhook
		});
		await db.SaveChangesAsync();

		var unitOfWork = new Mock<IUnitOfWork>();
		var logger = new Mock<ILogger<ProcessMonobankWebhookHandler>>();

		var handler = new ProcessMonobankWebhookHandler(db, unitOfWork.Object, logger.Object);
		var payload = CreatePayload(accountId, "event-duplicate", 50000);

		var result = await handler.Handle(
			new ProcessMonobankWebhookCommand(payload),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Contains("вже оброблено", result.Message);

		// Balance should NOT change
		var campaign = await db.Campaigns.FindAsync(campaignId);
		Assert.Equal(1000m, campaign!.CurrentAmount);
	}

	[Fact]
	public async Task Handle_UnknownAccount_ReturnsSuccessIgnored()
	{
		await using var db = _fixture.CreateContext();

		var unitOfWork = new Mock<IUnitOfWork>();
		var logger = new Mock<ILogger<ProcessMonobankWebhookHandler>>();

		var handler = new ProcessMonobankWebhookHandler(db, unitOfWork.Object, logger.Object);
		var payload = CreatePayload("unknown-account-123", "event-999", 50000);

		var result = await handler.Handle(
			new ProcessMonobankWebhookCommand(payload),
			CancellationToken.None);

		// Should return success to prevent Monobank retry
		Assert.True(result.IsSuccess);
		Assert.Contains("не прив'язано", result.Message);
	}

	[Fact]
	public async Task Handle_NegativeAmount_DoesNotIncreaseBalance()
	{
		await using var db = _fixture.CreateContext();
		var (campaignId, accountId) = await SeedCampaignAsync(db, 5000m);

		var unitOfWork = new Mock<IUnitOfWork>();
		unitOfWork.Setup(x => x.ExecuteInTransactionAsync(It.IsAny<Func<CancellationToken, Task>>(), It.IsAny<CancellationToken>()))
			.Returns<Func<CancellationToken, Task>, CancellationToken>(async (action, ct) => await action(ct));

		var logger = new Mock<ILogger<ProcessMonobankWebhookHandler>>();

		var handler = new ProcessMonobankWebhookHandler(db, unitOfWork.Object, logger.Object);
		var payload = CreatePayload(accountId, "event-neg", -10000); // -100 UAH

		var result = await handler.Handle(
			new ProcessMonobankWebhookCommand(payload),
			CancellationToken.None);

		Assert.True(result.IsSuccess);

		// Balance should NOT change for negative (outgoing) transactions
		var campaign = await db.Campaigns.FindAsync(campaignId);
		Assert.Equal(5000m, campaign!.CurrentAmount);

		// But transaction should still be recorded for audit
		var tx = db.CampaignTransactions.FirstOrDefault(t => t.ExternalTransactionId == "event-neg");
		Assert.NotNull(tx);
		Assert.Equal(-10000m, tx.Amount);
	}
}
