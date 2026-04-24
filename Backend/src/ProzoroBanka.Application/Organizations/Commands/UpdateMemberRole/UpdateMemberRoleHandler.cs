using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UpdateMemberRole;

public class UpdateMemberRoleHandler
	: IRequestHandler<UpdateMemberRoleCommand, ServiceResponse<OrganizationMemberDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public UpdateMemberRoleHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<OrganizationMemberDto>> Handle(
		UpdateMemberRoleCommand request, CancellationToken cancellationToken)
	{
		var access = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			requiredPermission: OrganizationPermissions.ManageMembers,
			ct: cancellationToken);

		if (!access.IsSuccess)
			return ServiceResponse<OrganizationMemberDto>.Failure(access.Message);

		var target = await _db.OrganizationMembers
			.Include(m => m.User)
			.FirstOrDefaultAsync(
				m => m.OrganizationId == request.OrganizationId &&
					 m.UserId == request.TargetUserId &&
					 !m.IsDeleted,
				cancellationToken);

		if (target is null)
			return ServiceResponse<OrganizationMemberDto>.Failure("Учасника не знайдено");

		if (target.Role == OrganizationRole.Owner)
			return ServiceResponse<OrganizationMemberDto>.Failure("Неможливо змінити роль власника організації");

		// Prevent assigning Owner role through this endpoint
		if (request.NewRole == OrganizationRole.Owner)
			return ServiceResponse<OrganizationMemberDto>.Failure("Роль Owner не можна призначити через цей endpoint");

		target.Role = request.NewRole;

		// Normalize zero permission mask to role defaults
		var finalPermissions = request.NewPermissionsFlags == OrganizationPermissions.None
			? InvitationRules.GetPermissionsForRole(request.NewRole)
			: request.NewPermissionsFlags;
		target.PermissionsFlags = finalPermissions;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<OrganizationMemberDto>.Success(new OrganizationMemberDto(
			target.UserId,
			target.User.FirstName,
			target.User.LastName,
			target.User.Email,
			target.Role,
			target.PermissionsFlags,
			target.JoinedAt,
			_fileStorage.ResolvePublicUrl(target.User.ProfilePhotoStorageKey)));
	}
}
