using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Queries.GetOrganizationInvitations;

public class GetOrganizationInvitationsHandler
	: IRequestHandler<GetOrganizationInvitationsQuery, ServiceResponse<IReadOnlyList<InvitationDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetOrganizationInvitationsHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<IReadOnlyList<InvitationDto>>> Handle(
		GetOrganizationInvitationsQuery request, CancellationToken cancellationToken)
	{
		var orgExists = await _db.Organizations
			.AnyAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (!orgExists)
			return ServiceResponse<IReadOnlyList<InvitationDto>>.Failure("Організацію не знайдено");

		var canManage = await _orgAuth.HasPermission(
			request.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageInvitations, cancellationToken);

		if (!canManage)
			return ServiceResponse<IReadOnlyList<InvitationDto>>.Failure("Недостатньо прав для перегляду запрошень");

		var invitations = await _db.Invitations
			.AsNoTracking()
			.Where(i => i.OrganizationId == request.OrganizationId)
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
				i.Token))   // admins can see tokens for link invites
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<InvitationDto>>.Success(invitations);
	}
}
