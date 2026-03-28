using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.UpdateCampaign;

public record UpdateCampaignCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	string? Title,
	string? Description,
	decimal? GoalAmount,
	DateTime? Deadline) : IRequest<ServiceResponse<CampaignDto>>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns];
}

public class UpdateCampaignCommandValidator : AbstractValidator<UpdateCampaignCommand>
{
	public UpdateCampaignCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();

		RuleFor(x => x.Title)
			.MinimumLength(3).WithMessage("Назва збору мінімум 3 символи")
			.MaximumLength(300).WithMessage("Назва збору максимум 300 символів")
			.When(x => x.Title is not null);

		RuleFor(x => x.Description)
			.MaximumLength(5000).WithMessage("Опис максимум 5000 символів")
			.When(x => x.Description is not null);

		RuleFor(x => x.GoalAmount)
			.GreaterThan(0).WithMessage("Фінансова ціль повинна бути більше 0")
			.When(x => x.GoalAmount.HasValue);

		RuleFor(x => x.Deadline)
			.GreaterThan(DateTime.UtcNow).WithMessage("Дедлайн повинен бути в майбутньому")
			.When(x => x.Deadline.HasValue);
	}
}
