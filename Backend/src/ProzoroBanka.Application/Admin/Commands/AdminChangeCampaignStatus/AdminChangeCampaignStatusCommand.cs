using MediatR;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Admin.Commands.AdminChangeCampaignStatus;

public record AdminChangeCampaignStatusCommand(
	Guid CampaignId,
	CampaignStatus NewStatus) : IRequest<ServiceResponse>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns, CacheTag.Admin];
}
