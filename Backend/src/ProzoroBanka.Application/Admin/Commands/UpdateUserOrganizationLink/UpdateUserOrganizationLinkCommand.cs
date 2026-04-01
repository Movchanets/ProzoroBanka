using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Admin.Commands.UpdateUserOrganizationLink;

public record UpdateUserOrganizationLinkCommand(
	Guid UserId,
	Guid OrganizationId,
	OrganizationRole Role,
	OrganizationPermissions Permissions) : IRequest<ServiceResponse<AdminUserOrganizationLinkDto>>;

public class UpdateUserOrganizationLinkCommandValidator : AbstractValidator<UpdateUserOrganizationLinkCommand>
{
	public UpdateUserOrganizationLinkCommandValidator()
	{
		RuleFor(x => x.UserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.Role).IsInEnum().NotEqual(OrganizationRole.Owner);
	}
}

public class UpdateUserOrganizationLinkCommandHandler
	: IRequestHandler<UpdateUserOrganizationLinkCommand, ServiceResponse<AdminUserOrganizationLinkDto>>
{
	private readonly IApplicationDbContext _db;

	public UpdateUserOrganizationLinkCommandHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<AdminUserOrganizationLinkDto>> Handle(
		UpdateUserOrganizationLinkCommand request,
		CancellationToken cancellationToken)
	{
		var user = await _db.Users
			.FirstOrDefaultAsync(entity => entity.IdentityUserId == request.UserId, cancellationToken);

		if (user is null)
			return ServiceResponse<AdminUserOrganizationLinkDto>.Failure("Користувача не знайдено");

		var membership = await _db.OrganizationMembers
			.Include(entity => entity.Organization)
			.FirstOrDefaultAsync(
				entity => entity.OrganizationId == request.OrganizationId && entity.UserId == user.Id,
				cancellationToken);

		if (membership is null)
			return ServiceResponse<AdminUserOrganizationLinkDto>.Failure("Зв'язок користувача з організацією не знайдено");

		if (membership.Organization.OwnerUserId == user.Id)
			return ServiceResponse<AdminUserOrganizationLinkDto>.Failure("Неможливо редагувати зв'язок власника організації через цей endpoint");

		membership.Role = request.Role;
		membership.PermissionsFlags = request.Permissions;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<AdminUserOrganizationLinkDto>.Success(new AdminUserOrganizationLinkDto(
			membership.OrganizationId,
			membership.Organization.Name,
			membership.Organization.Slug,
			membership.Organization.IsVerified,
			membership.Organization.PlanType,
			membership.Role,
			membership.PermissionsFlags,
			membership.JoinedAt,
			false));
	}
}
