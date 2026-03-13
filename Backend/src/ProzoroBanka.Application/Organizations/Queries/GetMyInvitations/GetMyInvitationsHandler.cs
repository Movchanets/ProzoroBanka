using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Queries.GetMyInvitations;

public class GetMyInvitationsHandler
	: IRequestHandler<GetMyInvitationsQuery, ServiceResponse<IReadOnlyList<InvitationDto>>>
{
	private readonly IApplicationDbContext _db;

	public GetMyInvitationsHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<IReadOnlyList<InvitationDto>>> Handle(
		GetMyInvitationsQuery request, CancellationToken cancellationToken)
	{
		var callerUser = await _db.Users
			.AsNoTracking()
			.FirstOrDefaultAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

		if (callerUser is null)
			return ServiceResponse<IReadOnlyList<InvitationDto>>.Failure("Користувача не знайдено");

		// Return pending email-based invitations addressed to this user's email
		var invitations = await _db.Invitations
			.AsNoTracking()
			.Where(i =>
				i.Email == callerUser.Email.ToLower() &&
				i.Status == InvitationStatus.Pending &&
				i.ExpiresAt > DateTime.UtcNow)
			.Include(i => i.Organization)
			.Include(i => i.Inviter)
			.OrderByDescending(i => i.CreatedAt)
			.Select(i => new InvitationDto(
				i.Id,
				i.OrganizationId,
				i.Organization.Name,
				i.Organization.LogoStorageKey,
				i.Inviter.FirstName,
				i.Inviter.LastName,
				i.Email,
				i.DefaultRole,
				i.Status,
				i.ExpiresAt,
				i.CreatedAt,
				null))   // token not exposed to invitees
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<InvitationDto>>.Success(invitations);
	}
}
