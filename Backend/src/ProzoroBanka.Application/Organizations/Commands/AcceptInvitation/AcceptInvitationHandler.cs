using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.AcceptInvitation;

public class AcceptInvitationHandler : IRequestHandler<AcceptInvitationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public AcceptInvitationHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(
		AcceptInvitationCommand request, CancellationToken cancellationToken)
	{
		var invitation = await _db.Invitations
			.FirstOrDefaultAsync(i => i.Token == request.Token, cancellationToken);

		if (invitation is null)
			return ServiceResponse.Failure("Запрошення не знайдено");

		if (invitation.Status != InvitationStatus.Pending)
			return ServiceResponse.Failure("Запрошення вже використано або скасовано");

		if (invitation.ExpiresAt < DateTime.UtcNow)
		{
			invitation.Status = InvitationStatus.Expired;
			await _db.SaveChangesAsync(cancellationToken);
			return ServiceResponse.Failure("Термін дії запрошення закінчився");
		}

		// For email-based invitations, verify the caller's email matches
		if (invitation.Email is not null)
		{
			var callerUser = await _db.Users
				.AsNoTracking()
				.FirstOrDefaultAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

			if (callerUser is null)
				return ServiceResponse.Failure("Користувача не знайдено");

			if (!string.Equals(callerUser.Email, invitation.Email, StringComparison.OrdinalIgnoreCase))
				return ServiceResponse.Failure("Це запрошення призначено для іншого email");
		}

		// Check if already a member
		var alreadyMember = await _db.OrganizationMembers
			.AnyAsync(
				m => m.OrganizationId == invitation.OrganizationId && m.UserId == request.CallerDomainUserId,
				cancellationToken);

		if (alreadyMember)
			return ServiceResponse.Failure("Ви вже є учасником цієї організації");

		// Determine default permissions for the role
		var permissionsFlags = invitation.DefaultRole switch
		{
			OrganizationRole.Admin => OrganizationPermissions.ManageOrganization
				| OrganizationPermissions.ManageMembers
				| OrganizationPermissions.ManageInvitations
				| OrganizationPermissions.ManageReceipts
				| OrganizationPermissions.ViewReports,
			OrganizationRole.Reporter => OrganizationPermissions.ManageReceipts,
			_ => OrganizationPermissions.None
		};

		var member = new OrganizationMember
		{
			OrganizationId = invitation.OrganizationId,
			UserId = request.CallerDomainUserId,
			Role = invitation.DefaultRole,
			PermissionsFlags = permissionsFlags,
			JoinedAt = DateTime.UtcNow
		};

		_db.OrganizationMembers.Add(member);
		invitation.Status = InvitationStatus.Accepted;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success();
	}
}
