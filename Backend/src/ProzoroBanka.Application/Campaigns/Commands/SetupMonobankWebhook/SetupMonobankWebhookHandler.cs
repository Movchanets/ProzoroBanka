using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.SetupMonobankWebhook;

public class SetupMonobankWebhookHandler : IRequestHandler<SetupMonobankWebhookCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IMonobankStatelessProxyService _monobank;
	private readonly ILogger<SetupMonobankWebhookHandler> _logger;

	public SetupMonobankWebhookHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IMonobankStatelessProxyService monobank,
		ILogger<SetupMonobankWebhookHandler> logger)
	{
		_db = db;
		_orgAuth = orgAuth;
		_monobank = monobank;
		_logger = logger;
	}

	public async Task<ServiceResponse> Handle(
		SetupMonobankWebhookCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse.Failure("Збір не знайдено");

		var hasPermission = await _orgAuth.HasPermission(
			campaign.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageCampaigns, cancellationToken);

		if (!hasPermission)
			return ServiceResponse.Failure("Недостатньо прав для налаштування webhook");

		// Resolve current jar balance before persisting webhook setup.
		var clientInfoResult = await _monobank.GetClientInfoAsync(request.Token, cancellationToken);
		if (!clientInfoResult.IsSuccess || clientInfoResult.Payload is null)
			return ServiceResponse.Failure(clientInfoResult.Message ?? "Не вдалося отримати дані Monobank");

		var selectedJar = clientInfoResult.Payload.Jars
			.FirstOrDefault(j => j.Id == request.SelectedJarAccountId);

		if (selectedJar is null)
			return ServiceResponse.Failure("Обрану банку не знайдено у відповіді Monobank");

		// Register webhook via Monobank API (token used only in this scope)
		var webhookResult = await _monobank.RegisterWebhookAsync(
			request.Token, request.WebhookUrl, cancellationToken);

		if (!webhookResult.IsSuccess)
			return webhookResult;

		var previousAmount = campaign.CurrentAmount;
		var previousGoal = campaign.GoalAmount;
		var syncedAmount = selectedJar.Balance;
		var syncedGoal = selectedJar.Goal ?? campaign.GoalAmount;
		var balanceDelta = syncedAmount - previousAmount;
		var goalChanged = selectedJar.Goal.HasValue && syncedGoal != previousGoal;

		// Persist only the jar/account ID — never the token
		campaign.MonobankAccountId = request.SelectedJarAccountId;
		campaign.CurrentAmount = syncedAmount;
		campaign.GoalAmount = syncedGoal;

		if (balanceDelta != 0)
		{
			_db.CampaignTransactions.Add(new CampaignTransaction
			{
				CampaignId = campaign.Id,
				ExternalTransactionId = $"sync-{Guid.NewGuid():N}",
				Amount = balanceDelta,
				Description = "Початкова синхронізація балансу Monobank банки",
				TransactionTimeUtc = DateTime.UtcNow,
				Source = BalanceUpdateSource.Manual
			});
		}

		await _db.SaveChangesAsync(cancellationToken);

		_logger.LogInformation(
			"Monobank webhook set up for campaign {CampaignId}, jar bound {JarId}, balance synced to {BalanceMinorUnits}, goal synced to {GoalMinorUnits}",
			campaign.Id,
			request.SelectedJarAccountId,
			syncedAmount,
			syncedGoal);

		return ServiceResponse.Success("Monobank webhook налаштовано");
	}
}
