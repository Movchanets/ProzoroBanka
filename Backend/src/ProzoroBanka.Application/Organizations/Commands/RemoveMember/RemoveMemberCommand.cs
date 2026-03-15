using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.RemoveMember;

public record RemoveMemberCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid TargetUserId) : IRequest<ServiceResponse>;

public class RemoveMemberCommandValidator : AbstractValidator<RemoveMemberCommand>
{
	public RemoveMemberCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.TargetUserId).NotEmpty();
	}
}
