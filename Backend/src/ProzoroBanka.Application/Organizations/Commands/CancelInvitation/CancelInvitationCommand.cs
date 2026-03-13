using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.CancelInvitation;

public record CancelInvitationCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid InvitationId) : IRequest<ServiceResponse>;

public class CancelInvitationCommandValidator : AbstractValidator<CancelInvitationCommand>
{
	public CancelInvitationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.InvitationId).NotEmpty();
	}
}
