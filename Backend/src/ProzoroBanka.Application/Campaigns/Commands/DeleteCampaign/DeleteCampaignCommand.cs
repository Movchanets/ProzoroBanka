using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.DeleteCampaign;

public record DeleteCampaignCommand(
	Guid CallerDomainUserId,
	Guid CampaignId) : IRequest<ServiceResponse>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns];
}

public class DeleteCampaignCommandValidator : AbstractValidator<DeleteCampaignCommand>
{
	public DeleteCampaignCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
	}
}
