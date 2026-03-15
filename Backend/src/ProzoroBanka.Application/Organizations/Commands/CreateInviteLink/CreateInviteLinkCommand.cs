using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.CreateInviteLink;

public record CreateInviteLinkCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	OrganizationRole Role,
	int ExpiresInHours) : IRequest<ServiceResponse<InvitationDto>>;

public class CreateInviteLinkCommandValidator : AbstractValidator<CreateInviteLinkCommand>
{
	public CreateInviteLinkCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.ExpiresInHours)
			.InclusiveBetween(1, 168)
			.WithMessage("Термін дії запрошення має бути від 1 до 168 годин (7 днів)");
	}
}
