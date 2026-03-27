using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.ProcessMonobankWebhook;

public class ProcessMonobankWebhookHandler : IRequestHandler<ProcessMonobankWebhookCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IUnitOfWork _unitOfWork;
	private readonly ILogger<ProcessMonobankWebhookHandler> _logger;

	public ProcessMonobankWebhookHandler(
		IApplicationDbContext db,
		IUnitOfWork unitOfWork,
		ILogger<ProcessMonobankWebhookHandler> logger)
	{
		_db = db;
		_unitOfWork = unitOfWork;
		_logger = logger;
	}

	public async Task<ServiceResponse> Handle(
		ProcessMonobankWebhookCommand request, CancellationToken cancellationToken)
	{
		var payload = request.Payload;
		var data = payload.Data;
		var item = data?.StatementItem;

		if (data?.Account is null || item?.Id is null)
		{
			_logger.LogWarning("Monobank webhook received with missing required fields");
			return ServiceResponse.Failure("Payload відсутні обов'язкові поля");
		}

		// Resolve campaign by MonobankAccountId
		var campaign = await _db.Campaigns
			.FirstOrDefaultAsync(c => c.MonobankAccountId == data.Account, cancellationToken);

		if (campaign is null)
		{
			_logger.LogInformation(
				"Monobank webhook for unlinked account {AccountId} — ignored",
				data.Account);
			// Return success to not trigger Monobank retry for unknown accounts
			return ServiceResponse.Success("Рахунок не прив'язано до жодного збору");
		}

		// Idempotency check: skip duplicate events
		var alreadyProcessed = await _db.CampaignTransactions
			.AnyAsync(t =>
				t.CampaignId == campaign.Id &&
				t.ExternalTransactionId == item.Id,
				cancellationToken);

		if (alreadyProcessed)
		{
			_logger.LogInformation(
				"Duplicate webhook event {ExternalId} for campaign {CampaignId} — no-op",
				item.Id, campaign.Id);
			return ServiceResponse.Success("Подію вже оброблено");
		}

		// Store amounts in minor units (kopecks) to match campaign amounts across the system.
		var amountMinorUnits = item.Amount;
		var amountUahForLog = item.Amount / 100m;

		// Only process incoming (positive) amounts for donation campaigns
		// But store all events for audit
		var transactionDescription = !string.IsNullOrWhiteSpace(item.Comment)
			? item.Comment
			: item.Description ?? "Monobank транзакція";

		var transactionTimeUtc = DateTimeOffset.FromUnixTimeSeconds(item.Time).UtcDateTime;

		// Compute payload hash for diagnostics (no secrets)
		var payloadHash = ComputePayloadHash(item.Id, data.Account, item.Amount);

		await _unitOfWork.ExecuteInTransactionAsync(async ct =>
		{
			// Update campaign balance (only add positive amounts)
			if (item.Amount > 0)
			{
				campaign.CurrentAmount += amountMinorUnits;
			}

			_db.CampaignTransactions.Add(new CampaignTransaction
			{
				CampaignId = campaign.Id,
				ExternalTransactionId = item.Id,
				Amount = amountMinorUnits,
				Description = transactionDescription,
				TransactionTimeUtc = transactionTimeUtc,
				Source = BalanceUpdateSource.MonobankWebhook,
				ProviderPayloadHash = payloadHash
			});

			await _db.SaveChangesAsync(ct);
		}, cancellationToken);

		_logger.LogInformation(
			"Monobank webhook processed: campaign {CampaignId}, amount {Amount} UAH, externalId {ExternalId}",
			campaign.Id, amountUahForLog, item.Id);

		return ServiceResponse.Success("Webhook оброблено");
	}

	private static string ComputePayloadHash(string id, string account, long amount)
	{
		var input = $"{id}:{account}:{amount}";
		var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
		return Convert.ToHexStringLower(bytes)[..32];
	}
}
