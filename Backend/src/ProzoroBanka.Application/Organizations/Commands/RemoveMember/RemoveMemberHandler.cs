using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.RemoveMember;

public class RemoveMemberHandler : IRequestHandler<RemoveMemberCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public RemoveMemberHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(
		RemoveMemberCommand request, CancellationToken cancellationToken)
	{
		var members = await _db.OrganizationMembers
			.Where(m => m.OrganizationId == request.OrganizationId)
			.ToListAsync(cancellationToken);

		if (!members.Any())
			return ServiceResponse.Failure("Організацію не знайдено");

		var caller = members.FirstOrDefault(m => m.UserId == request.CallerDomainUserId);
		if (caller is null)
			return ServiceResponse.Failure("Немає доступу до організації");

		if (!caller.PermissionsFlags.HasFlag(OrganizationPermissions.ManageMembers))
			return ServiceResponse.Failure("Недостатньо прав для видалення учасника");

		var target = members.FirstOrDefault(m => m.UserId == request.TargetUserId);
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
