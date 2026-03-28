using MediatR;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.AdminDeleteOrganization;

public record AdminDeleteOrganizationCommand(
	Guid OrganizationId) : IRequest<ServiceResponse>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Organizations, CacheTag.Campaigns, CacheTag.Admin];
}
