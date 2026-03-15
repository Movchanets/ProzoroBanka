using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Commands.UpdateOrganization;

public record UpdateOrganizationCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	string? Name,
	string? Description,
	string? Website,
	string? ContactEmail) : IRequest<ServiceResponse<OrganizationDto>>;

public class UpdateOrganizationCommandValidator : AbstractValidator<UpdateOrganizationCommand>
{
	public UpdateOrganizationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();

		RuleFor(x => x.Name)
			.MinimumLength(3).WithMessage("Назва організації мінімум 3 символи")
			.MaximumLength(200).WithMessage("Назва організації максимум 200 символів")
			.When(x => x.Name is not null);

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
