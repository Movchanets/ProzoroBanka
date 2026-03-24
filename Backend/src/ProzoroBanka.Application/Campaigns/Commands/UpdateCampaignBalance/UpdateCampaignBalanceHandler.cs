using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.UpdateCampaignBalance;

public class UpdateCampaignBalanceHandler : IRequestHandler<UpdateCampaignBalanceCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly ILogger<UpdateCampaignBalanceHandler> _logger;

	public UpdateCampaignBalanceHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		ILogger<UpdateCampaignBalanceHandler> logger)
	{
		_db = db;
		_orgAuth = orgAuth;
		_logger = logger;
	}

	public async Task<ServiceResponse> Handle(
		UpdateCampaignBalanceCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse.Failure("Збір не знайдено");

		var hasPermission = await _orgAuth.HasPermission(
			campaign.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageCampaigns, cancellationToken);

		if (!hasPermission)
			return ServiceResponse.Failure("Недостатньо прав для оновлення балансу збору");

		var previousAmount = campaign.CurrentAmount;
		var delta = request.NewCurrentAmount - previousAmount;

		campaign.CurrentAmount = request.NewCurrentAmount;

		// Create audit transaction record
		_db.CampaignTransactions.Add(new CampaignTransaction
		{
			CampaignId = campaign.Id,
			ExternalTransactionId = $"manual-{Guid.NewGuid():N}",
			Amount = delta,
			Description = request.Reason ?? "Ручне оновлення балансу",
			TransactionTimeUtc = DateTime.UtcNow,
			Source = BalanceUpdateSource.Manual
		});

		await _db.SaveChangesAsync(cancellationToken);

		_logger.LogInformation(
			"Campaign {CampaignId} balance manually updated from {PreviousAmount} to {NewAmount} by user {UserId}",
			campaign.Id, previousAmount, request.NewCurrentAmount, request.CallerDomainUserId);

		return ServiceResponse.Success("Баланс збору оновлено");
	}
}
