using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.RemoveMember;

public class RemoveMemberHandler : IRequestHandler<RemoveMemberCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public RemoveMemberHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse> Handle(
		RemoveMemberCommand request, CancellationToken cancellationToken)
	{
		var organizationExists = await _db.Organizations
			.AnyAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, cancellationToken);

		if (!organizationExists)
			return ServiceResponse.Failure("Організацію не знайдено");

		var canManageMembers = await _orgAuth.HasPermission(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManageMembers,
			cancellationToken);

		if (!canManageMembers)
		{
			var callerIsMember = await _orgAuth.IsMember(request.OrganizationId, request.CallerDomainUserId, cancellationToken);
			if (!callerIsMember)
				return ServiceResponse.Failure("Немає доступу до організації");

			return ServiceResponse.Failure("Недостатньо прав для видалення учасника");
		}

		var target = await _db.OrganizationMembers
			.FirstOrDefaultAsync(
				m => m.OrganizationId == request.OrganizationId &&
					 m.UserId == request.TargetUserId &&
					 !m.IsDeleted,
				cancellationToken);

		if (target is null)
			return ServiceResponse.Failure("Учасника не знайдено");

		if (target.Role == OrganizationRole.Owner)
			return ServiceResponse.Failure("Неможливо видалити власника організації");

		if (request.TargetUserId == request.CallerDomainUserId)
			return ServiceResponse.Failure("Для виходу з організації використовуйте відповідний endpoint");

		target.IsDeleted = true;
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success("Учасника видалено з організації");
	}
}
