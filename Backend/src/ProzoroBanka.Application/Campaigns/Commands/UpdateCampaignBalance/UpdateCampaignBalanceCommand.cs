using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.UpdateCampaignBalance;

public record UpdateCampaignBalanceCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	long NewCurrentAmount,
	string? Reason) : IRequest<ServiceResponse>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns];
}

public class UpdateCampaignBalanceCommandValidator : AbstractValidator<UpdateCampaignBalanceCommand>
{
	public UpdateCampaignBalanceCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.NewCurrentAmount)
			.GreaterThanOrEqualTo(0).WithMessage("Сума повинна бути 0 або більше");
		RuleFor(x => x.Reason)
			.MaximumLength(500).WithMessage("Причина максимум 500 символів")
			.When(x => x.Reason is not null);
	}
}
