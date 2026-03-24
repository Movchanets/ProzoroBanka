using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
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

		// Register webhook via Monobank API (token used only in this scope)
		var webhookResult = await _monobank.RegisterWebhookAsync(
			request.Token, request.WebhookUrl, cancellationToken);

		if (!webhookResult.IsSuccess)
			return webhookResult;

		// Persist only the jar/account ID — never the token
		campaign.MonobankAccountId = request.SelectedJarAccountId;
		await _db.SaveChangesAsync(cancellationToken);

		_logger.LogInformation(
			"Monobank webhook set up for campaign {CampaignId}, jar bound",
			campaign.Id);

		return ServiceResponse.Success("Monobank webhook налаштовано");
	}
}
