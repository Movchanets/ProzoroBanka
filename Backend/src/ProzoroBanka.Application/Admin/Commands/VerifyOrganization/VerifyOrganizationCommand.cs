using MediatR;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.VerifyOrganization;

public record VerifyOrganizationCommand(
	Guid OrganizationId,
	bool IsVerified) : IRequest<ServiceResponse>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [Common.CacheTag.Organizations, Common.CacheTag.Admin];
}
