using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.DeclineInvitation;

public class DeclineInvitationHandler : IRequestHandler<DeclineInvitationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public DeclineInvitationHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(
		DeclineInvitationCommand request, CancellationToken cancellationToken)
	{
		var invitation = await _db.Invitations
			.FirstOrDefaultAsync(i => i.Token == request.Token && !i.IsDeleted, cancellationToken);

		if (invitation is null)
			return ServiceResponse.Failure("Запрошення не знайдено");

		if (invitation.Status != InvitationStatus.Pending)
			return ServiceResponse.Failure(InvitationRules.GetInactiveMessage(invitation.Status));

		if (InvitationRules.IsExpired(invitation, DateTime.UtcNow))
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

		var updated = await _db.Invitations
			.Where(i => i.Id == invitation.Id && i.Status == InvitationStatus.Pending && !i.IsDeleted)
			.ExecuteUpdateAsync(
				setters => setters
					.SetProperty(i => i.Status, InvitationStatus.Declined)
					.SetProperty(i => i.UpdatedAt, DateTime.UtcNow),
				cancellationToken);

		if (updated == 0)
			return ServiceResponse.Failure("Запрошення вже використано або скасовано");

		invitation.Status = InvitationStatus.Declined;

		return ServiceResponse.Success();
	}
}
