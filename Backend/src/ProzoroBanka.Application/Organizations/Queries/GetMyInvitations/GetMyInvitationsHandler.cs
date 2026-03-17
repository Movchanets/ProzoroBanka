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
	private readonly IFileStorage _fileStorage;

	public GetMyInvitationsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
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
			.Select(i => new
			{
				i.Id,
				i.OrganizationId,
				OrganizationName = i.Organization.Name,
				OrganizationLogoStorageKey = i.Organization.LogoStorageKey,
				InviterFirstName = i.Inviter.FirstName,
				InviterLastName = i.Inviter.LastName,
				i.Email,
				Role = i.DefaultRole,
				i.Status,
				i.ExpiresAt,
				i.CreatedAt
			})
			.ToListAsync(cancellationToken);

		var result = invitations
			.Select(i => new InvitationDto(
				i.Id,
				i.OrganizationId,
				i.OrganizationName,
				ResolvePublicUrl(i.OrganizationLogoStorageKey),
				i.InviterFirstName,
				i.InviterLastName,
				i.Email,
				i.Role,
				i.Status,
				i.ExpiresAt,
				i.CreatedAt,
				null))
			.ToList();

		return ServiceResponse<IReadOnlyList<InvitationDto>>.Success(result);
	}

	private string? ResolvePublicUrl(string? storageKey)
	{
		if (string.IsNullOrWhiteSpace(storageKey))
			return null;

		return _fileStorage.GetPublicUrl(storageKey);
	}
}
