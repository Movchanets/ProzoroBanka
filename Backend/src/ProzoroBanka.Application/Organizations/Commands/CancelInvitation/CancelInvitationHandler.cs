using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.CancelInvitation;

public class CancelInvitationHandler : IRequestHandler<CancelInvitationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public CancelInvitationHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse> Handle(
		CancelInvitationCommand request, CancellationToken cancellationToken)
	{
		var invitation = await _db.Invitations
			.FirstOrDefaultAsync(
				i => i.Id == request.InvitationId && i.OrganizationId == request.OrganizationId,
				cancellationToken);

		if (invitation is null)
			return ServiceResponse.Failure("Запрошення не знайдено");

		if (invitation.Status != InvitationStatus.Pending)
			return ServiceResponse.Failure("Можна скасувати тільки активне запрошення");

		// Allow cancellation if the caller is the inviter OR has ManageInvitations permission
		var isInviter = invitation.InviterId == request.CallerDomainUserId;
		if (!isInviter)
		{
			var canManage = await _orgAuth.HasPermission(
				request.OrganizationId, request.CallerDomainUserId,
				OrganizationPermissions.ManageInvitations, cancellationToken);

			if (!canManage)
				return ServiceResponse.Failure("Недостатньо прав для скасування запрошення");
		}

		invitation.Status = InvitationStatus.Cancelled;
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success();
	}
}
