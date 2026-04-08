using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IOrganizationPlanLimitService
{
	Task<CampaignCreationAllowance> CanCreateCampaignAsync(Guid organizationId, CancellationToken cancellationToken);
}
