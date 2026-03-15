using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UpdateMemberRole;

public record UpdateMemberRoleCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid TargetUserId,
	OrganizationRole NewRole,
	OrganizationPermissions NewPermissionsFlags) : IRequest<ServiceResponse<OrganizationMemberDto>>;

public class UpdateMemberRoleCommandValidator : AbstractValidator<UpdateMemberRoleCommand>
{
	public UpdateMemberRoleCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.TargetUserId).NotEmpty();
		RuleFor(x => x.NewRole)
			.IsInEnum().WithMessage("Вказано невалідну роль учасника");
	}
}
