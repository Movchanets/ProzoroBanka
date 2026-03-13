using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.AcceptInvitation;

public record AcceptInvitationCommand(
	Guid CallerDomainUserId,
	string Token) : IRequest<ServiceResponse>;

public class AcceptInvitationCommandValidator : AbstractValidator<AcceptInvitationCommand>
{
	public AcceptInvitationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.Token)
			.NotEmpty().WithMessage("Токен запрошення обов'язковий");
	}
}
