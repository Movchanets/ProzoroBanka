using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UpdateMemberRole;

public class UpdateMemberRoleHandler
	: IRequestHandler<UpdateMemberRoleCommand, ServiceResponse<OrganizationMemberDto>>
{
	private readonly IApplicationDbContext _db;

	public UpdateMemberRoleHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<OrganizationMemberDto>> Handle(
		UpdateMemberRoleCommand request, CancellationToken cancellationToken)
	{
		var members = await _db.OrganizationMembers
			.Include(m => m.User)
			.Where(m => m.OrganizationId == request.OrganizationId)
			.ToListAsync(cancellationToken);

		if (!members.Any())
			return ServiceResponse<OrganizationMemberDto>.Failure("Організацію не знайдено");

		var caller = members.FirstOrDefault(m => m.UserId == request.CallerDomainUserId);
		if (caller is null)
			return ServiceResponse<OrganizationMemberDto>.Failure("Немає доступу до організації");

		if (!caller.PermissionsFlags.HasFlag(OrganizationPermissions.ManageMembers))
			return ServiceResponse<OrganizationMemberDto>.Failure("Недостатньо прав для зміни ролі учасника");

		var target = members.FirstOrDefault(m => m.UserId == request.TargetUserId);
		if (target is null)
			return ServiceResponse<OrganizationMemberDto>.Failure("Учасника не знайдено");

		if (target.Role == OrganizationRole.Owner)
			return ServiceResponse<OrganizationMemberDto>.Failure("Неможливо змінити роль власника організації");

		// Prevent assigning Owner role through this endpoint
		if (request.NewRole == OrganizationRole.Owner)
			return ServiceResponse<OrganizationMemberDto>.Failure("Роль Owner не можна призначити через цей endpoint");

		target.Role = request.NewRole;
		target.PermissionsFlags = request.NewPermissionsFlags;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<OrganizationMemberDto>.Success(new OrganizationMemberDto(
			target.UserId,
			target.User.FirstName,
			target.User.LastName,
			target.User.Email,
			target.Role,
			target.PermissionsFlags,
			target.JoinedAt));
	}
}
