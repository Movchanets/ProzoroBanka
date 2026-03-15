using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.DeclineInvitation;

public record DeclineInvitationCommand(
	Guid CallerDomainUserId,
	string Token) : IRequest<ServiceResponse>;

public class DeclineInvitationCommandValidator : AbstractValidator<DeclineInvitationCommand>
{
	public DeclineInvitationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.Token)
			.NotEmpty().WithMessage("Токен запрошення обов'язковий");
	}
}
