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
	DateTime? Deadline,
	string? SendUrl) : IRequest<ServiceResponse<CampaignDto>>, ICacheInvalidatingCommand
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
