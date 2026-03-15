using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.LeaveOrganization;

public record LeaveOrganizationCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse>;

public class LeaveOrganizationCommandValidator : AbstractValidator<LeaveOrganizationCommand>
{
	public LeaveOrganizationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
	}
}
