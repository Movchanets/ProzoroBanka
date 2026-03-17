using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.InvitationSupport;
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
				i => i.Id == request.InvitationId && i.OrganizationId == request.OrganizationId && !i.IsDeleted,
				cancellationToken);

		if (invitation is null)
			return ServiceResponse.Failure("Запрошення не знайдено");

		if (invitation.Status != InvitationStatus.Pending)
			return ServiceResponse.Failure(InvitationRules.GetInactiveMessage(invitation.Status));

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

		var updated = await _db.Invitations
			.Where(i => i.Id == invitation.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted)
			.ExecuteUpdateAsync(
				setters => setters
					.SetProperty(i => i.Status, InvitationStatus.Cancelled)
					.SetProperty(i => i.UpdatedAt, DateTime.UtcNow),
				cancellationToken);

		if (updated == 0)
			return ServiceResponse.Failure("Можна скасувати тільки активне запрошення");

		invitation.Status = InvitationStatus.Cancelled;

		return ServiceResponse.Success();
	}
}
