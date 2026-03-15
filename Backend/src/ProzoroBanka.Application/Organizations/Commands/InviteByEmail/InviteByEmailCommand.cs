using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.InviteByEmail;

public record InviteByEmailCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	string Email,
	OrganizationRole Role) : IRequest<ServiceResponse<InvitationDto>>;

public class InviteByEmailCommandValidator : AbstractValidator<InviteByEmailCommand>
{
	public InviteByEmailCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.Email)
			.NotEmpty().WithMessage("Email обов'язковий")
			.EmailAddress().WithMessage("Невірний формат email")
			.MaximumLength(256).WithMessage("Email максимум 256 символів");
	}
}
