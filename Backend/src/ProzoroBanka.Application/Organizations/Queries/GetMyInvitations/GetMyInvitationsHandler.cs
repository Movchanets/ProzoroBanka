using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Application.Organizations.Queries.GetMyInvitations;

public class GetMyInvitationsHandler
	: IRequestHandler<GetMyInvitationsQuery, ServiceResponse<IReadOnlyList<InvitationDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IInvitationRepository _invitationRepository;
	private readonly IFileStorage _fileStorage;

	public GetMyInvitationsHandler(
		IApplicationDbContext db,
		IInvitationRepository invitationRepository,
		IFileStorage fileStorage)
	{
		_db = db;
		_invitationRepository = invitationRepository;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<InvitationDto>>> Handle(
		GetMyInvitationsQuery request, CancellationToken cancellationToken)
	{
		var callerUser = await _db.Users
			.AsNoTracking()
			.FirstOrDefaultAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

		if (callerUser is null)
			return ServiceResponse<IReadOnlyList<InvitationDto>>.Failure("Користувача не знайдено");

		// The repository keeps eager-loading consistent so this handler does not repeat
		// invitation graph loading and DTO composition rules.
		var invitations = await _invitationRepository.GetPendingForEmailAsync(callerUser.Email, cancellationToken);

		var result = invitations
			.Select(i => InvitationDtoFactory.Create(i, _fileStorage, includeEmail: true, includeToken: true))
			.ToList();

		return ServiceResponse<IReadOnlyList<InvitationDto>>.Success(result);
	}
}
