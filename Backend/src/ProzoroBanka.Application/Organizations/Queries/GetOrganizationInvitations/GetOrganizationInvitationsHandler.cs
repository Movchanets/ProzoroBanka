using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Application.Organizations.Queries.GetOrganizationInvitations;

public class GetOrganizationInvitationsHandler
	: IRequestHandler<GetOrganizationInvitationsQuery, ServiceResponse<IReadOnlyList<InvitationDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IInvitationRepository _invitationRepository;
	private readonly IFileStorage _fileStorage;

	public GetOrganizationInvitationsHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IInvitationRepository invitationRepository,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_invitationRepository = invitationRepository;
		_fileStorage = fileStorage;
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

		var invitations = await _invitationRepository.GetByOrganizationAsync(request.OrganizationId, cancellationToken);

		var result = invitations
			.Select(i => InvitationDtoFactory.Create(i, _fileStorage, includeEmail: true, includeToken: true))
			.ToList();

		return ServiceResponse<IReadOnlyList<InvitationDto>>.Success(result);
	}
}
