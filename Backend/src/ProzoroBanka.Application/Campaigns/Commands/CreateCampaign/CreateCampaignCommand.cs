using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.CreateCampaign;

public record CreateCampaignCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	string Title,
	string? Description,
	long GoalAmount,
	DateTime? Deadline,
	string? SendUrl) : IRequest<ServiceResponse<CampaignDto>>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns, CacheTag.Organizations];
}

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

		RuleFor(x => x.SendUrl)
			.Must(BeValidOptionalUrl)
			.WithMessage("Посилання на банку має бути валідним URL")
			.When(x => x.SendUrl is not null)
			.MaximumLength(512).WithMessage("Посилання на банку максимум 512 символів");
	}

	private static bool BeValidOptionalUrl(string? url)
	{
		if (string.IsNullOrWhiteSpace(url))
			return true;

		return Uri.TryCreate(url, UriKind.Absolute, out var uri)
			&& (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
	}
}
