using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Commands.CreateOrganization;

public record CreateOrganizationCommand(
	Guid CallerDomainUserId,
	string Name,
	string? Description,
	string? Website,
	string? ContactEmail) : IRequest<ServiceResponse<OrganizationDto>>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Organizations];
}

public class CreateOrganizationCommandValidator : AbstractValidator<CreateOrganizationCommand>
{
	public CreateOrganizationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();

		RuleFor(x => x.Name)
			.NotEmpty().WithMessage("Назва організації обов'язкова")
			.MinimumLength(3).WithMessage("Назва організації мінімум 3 символи")
			.MaximumLength(200).WithMessage("Назва організації максимум 200 символів");

		RuleFor(x => x.Description)
			.MaximumLength(2000).WithMessage("Опис максимум 2000 символів")
			.When(x => x.Description is not null);

		RuleFor(x => x.Website)
			.MaximumLength(512).WithMessage("Посилання на сайт максимум 512 символів")
			.When(x => x.Website is not null);

		RuleFor(x => x.ContactEmail)
			.EmailAddress().WithMessage("Невірний формат контактного email")
			.MaximumLength(256).WithMessage("Email максимум 256 символів")
			.When(x => !string.IsNullOrWhiteSpace(x.ContactEmail));
	}
}
