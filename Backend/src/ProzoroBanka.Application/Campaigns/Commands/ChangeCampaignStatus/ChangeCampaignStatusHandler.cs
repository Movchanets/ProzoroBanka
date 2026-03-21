using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.ChangeCampaignStatus;

public class ChangeCampaignStatusHandler : IRequestHandler<ChangeCampaignStatusCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public ChangeCampaignStatusHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse> Handle(
		ChangeCampaignStatusCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse.Failure("Збір не знайдено");

		var hasPermission = await _orgAuth.HasPermission(
			campaign.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageCampaigns, cancellationToken);

		if (!hasPermission)
			return ServiceResponse.Failure("Недостатньо прав для зміни статусу збору");

		if (!IsValidTransition(campaign.Status, request.NewStatus))
			return ServiceResponse.Failure(
				$"Неможливий перехід статусу з {campaign.Status} на {request.NewStatus}");

		// Draft → Active вимагає GoalAmount > 0
		if (campaign.Status == CampaignStatus.Draft && request.NewStatus == CampaignStatus.Active)
		{
			if (campaign.GoalAmount <= 0)
				return ServiceResponse.Failure("Для активації збору потрібна фінансова ціль більше 0");

			campaign.StartDate ??= DateTime.UtcNow;
		}

		campaign.Status = request.NewStatus;
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success("Статус збору змінено");
	}

	/// <summary>
	/// Перевіряє допустимість переходу стану:
	/// Draft → Active (GoalAmount > 0)
	/// Active → Paused
	/// Active → Completed
	/// Paused → Active
	/// Completed → нічого (фінальний)
	/// </summary>
	private static bool IsValidTransition(CampaignStatus current, CampaignStatus next)
	{
		return (current, next) switch
		{
			(CampaignStatus.Draft, CampaignStatus.Active) => true,
			(CampaignStatus.Active, CampaignStatus.Paused) => true,
			(CampaignStatus.Active, CampaignStatus.Completed) => true,
			(CampaignStatus.Paused, CampaignStatus.Active) => true,
			_ => false
		};
	}
}
