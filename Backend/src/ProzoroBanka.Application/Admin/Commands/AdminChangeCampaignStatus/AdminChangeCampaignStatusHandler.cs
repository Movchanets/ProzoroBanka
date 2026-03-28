using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Admin.Commands.AdminChangeCampaignStatus;

public class AdminChangeCampaignStatusHandler
	: IRequestHandler<AdminChangeCampaignStatusCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public AdminChangeCampaignStatusHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(AdminChangeCampaignStatusCommand request, CancellationToken ct)
	{
		var campaign = await _db.Campaigns
			.Include(c => c.Organization)
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId && !c.IsDeleted, ct);

		if (campaign is null)
			return ServiceResponse.Failure("Збір не знайдено.");

		var oldStatus = campaign.Status;
		campaign.Status = request.NewStatus;
		campaign.UpdatedAt = DateTime.UtcNow;

		// При активації встановлюємо StartDate, якщо не було
		if (request.NewStatus == CampaignStatus.Active && campaign.StartDate is null)
			campaign.StartDate = DateTime.UtcNow;

		await _db.SaveChangesAsync(ct);

		return ServiceResponse.Success(
			$"Статус збору «{campaign.Title}» змінено з {oldStatus} на {request.NewStatus}.");
	}
}
