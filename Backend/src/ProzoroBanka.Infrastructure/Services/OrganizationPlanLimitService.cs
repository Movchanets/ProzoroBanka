using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services;

public class OrganizationPlanLimitService : IOrganizationPlanLimitService
{
	private readonly IApplicationDbContext _db;
	private readonly ISystemSettingsService _systemSettingsService;

	public OrganizationPlanLimitService(
		IApplicationDbContext db,
		ISystemSettingsService systemSettingsService)
	{
		_db = db;
		_systemSettingsService = systemSettingsService;
	}

	public async Task<CampaignCreationAllowance> CanCreateCampaignAsync(Guid organizationId, CancellationToken cancellationToken)
	{
		var orgPlan = await _db.Organizations
			.AsNoTracking()
			.Where(o => o.Id == organizationId)
			.Select(o => o.PlanType)
			.FirstOrDefaultAsync(cancellationToken);

		var limits = await _systemSettingsService.GetPlanLimitsAsync(orgPlan, cancellationToken);
		var usedCampaigns = await _db.Campaigns
			.AsNoTracking()
			.CountAsync(c => c.OrganizationId == organizationId && !c.IsDeleted, cancellationToken);

		return new CampaignCreationAllowance(
			usedCampaigns < limits.MaxCampaigns,
			usedCampaigns,
			limits.MaxCampaigns);
	}
}
