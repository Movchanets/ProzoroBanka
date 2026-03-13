using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.DeleteOrganization;

public record DeleteOrganizationCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse>;

public class DeleteOrganizationCommandValidator : AbstractValidator<DeleteOrganizationCommand>
{
	public DeleteOrganizationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
	}
}
