using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Queries.GetInvitationByToken;

public class GetInvitationByTokenHandler
	: IRequestHandler<GetInvitationByTokenQuery, ServiceResponse<InvitationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetInvitationByTokenHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<InvitationDto>> Handle(
		GetInvitationByTokenQuery request, CancellationToken cancellationToken)
	{
		var invitation = await _db.Invitations
			.AsNoTracking()
			.Include(i => i.Organization)
			.Include(i => i.Inviter)
			.FirstOrDefaultAsync(i => i.Token == request.Token, cancellationToken);

		if (invitation is null)
			return ServiceResponse<InvitationDto>.Failure("Запрошення не знайдено");

		if (invitation.Status == InvitationStatus.Expired ||
			(invitation.Status == InvitationStatus.Pending && invitation.ExpiresAt < DateTime.UtcNow))
			return ServiceResponse<InvitationDto>.Failure("Термін дії запрошення закінчився");

		if (invitation.Status is InvitationStatus.Cancelled)
			return ServiceResponse<InvitationDto>.Failure("Запрошення скасовано");

		return ServiceResponse<InvitationDto>.Success(new InvitationDto(
			invitation.Id,
			invitation.OrganizationId,
			invitation.Organization.Name,
			ResolvePublicUrl(invitation.Organization.LogoStorageKey),
			invitation.Inviter.FirstName,
			invitation.Inviter.LastName,
			null,     // do not expose the target email publicly
			invitation.DefaultRole,
			invitation.Status,
			invitation.ExpiresAt,
			invitation.CreatedAt,
			null));   // token not echoed back (caller already has it from URL)
	}

	private string? ResolvePublicUrl(string? storageKey)
	{
		if (string.IsNullOrWhiteSpace(storageKey))
			return null;

		return _fileStorage.GetPublicUrl(storageKey);
	}
}
