using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface ISystemSettingsService
{
	Task<OrganizationPlanLimits> GetPlanLimitsAsync(OrganizationPlanType planType, CancellationToken cancellationToken);
	Task<int> GetMaxOwnedOrganizationsForNonAdminAsync(CancellationToken cancellationToken);
	Task<int> GetMaxJoinedOrganizationsForNonAdminAsync(CancellationToken cancellationToken);
	Task SavePlanLimitsAsync(OrganizationPlanType planType, OrganizationPlanLimits limits, CancellationToken cancellationToken);
	Task SaveGeneralLimitsAsync(int maxOwnedOrganizationsForNonAdmin, int maxJoinedOrganizationsForNonAdmin, CancellationToken cancellationToken);
}
