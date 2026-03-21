using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.CreateCampaign;

public record CreateCampaignCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	string Title,
	string? Description,
	decimal GoalAmount,
	DateTime? Deadline) : IRequest<ServiceResponse<CampaignDto>>;

public class CreateCampaignCommandValidator : AbstractValidator<CreateCampaignCommand>
{
	public CreateCampaignCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();

		RuleFor(x => x.Title)
			.NotEmpty().WithMessage("Назва збору обов'язкова")
			.MinimumLength(3).WithMessage("Назва збору мінімум 3 символи")
			.MaximumLength(300).WithMessage("Назва збору максимум 300 символів");

		RuleFor(x => x.Description)
			.MaximumLength(5000).WithMessage("Опис максимум 5000 символів")
			.When(x => x.Description is not null);

		RuleFor(x => x.GoalAmount)
			.GreaterThan(0).WithMessage("Фінансова ціль повинна бути більше 0");

		RuleFor(x => x.Deadline)
			.GreaterThan(DateTime.UtcNow).WithMessage("Дедлайн повинен бути в майбутньому")
			.When(x => x.Deadline.HasValue);
	}
}
