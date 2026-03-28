using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.DeleteOrganization;

public record DeleteOrganizationCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Organizations, CacheTag.Campaigns];
}

public class DeleteOrganizationCommandValidator : AbstractValidator<DeleteOrganizationCommand>
{
	public DeleteOrganizationCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
	}
}
