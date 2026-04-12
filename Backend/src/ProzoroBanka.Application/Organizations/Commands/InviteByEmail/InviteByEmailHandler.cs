using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Application.Organizations.Commands.InviteByEmail;

public class InviteByEmailHandler : IRequestHandler<InviteByEmailCommand, ServiceResponse<InvitationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IInvitationRepository _invitationRepository;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public InviteByEmailHandler(
		IApplicationDbContext db,
		IInvitationRepository invitationRepository,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_invitationRepository = invitationRepository;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<InvitationDto>> Handle(
		InviteByEmailCommand request, CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (org is null)
			return ServiceResponse<InvitationDto>.Failure("Організацію не знайдено");

		var canManage = await _orgAuth.HasPermission(
			request.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageInvitations, cancellationToken);

		if (!canManage)
			return ServiceResponse<InvitationDto>.Failure("Недостатньо прав для створення запрошень");

		// Repository check includes soft-delete and expiry filtering to avoid duplicated query rules.
		var existing = await _invitationRepository.HasPendingEmailInviteAsync(
			request.OrganizationId,
			request.Email,
			cancellationToken);

		if (existing)
			return ServiceResponse<InvitationDto>.Failure("Активне запрошення для цього email вже існує");

		var inviter = await _db.Users
			.AsNoTracking()
			.FirstOrDefaultAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

		var token = InvitationTokenGenerator.Generate();

		var invitation = new Invitation
		{
			OrganizationId = request.OrganizationId,
			InviterId = request.CallerDomainUserId,
			Email = request.Email.ToLowerInvariant(),
			Token = token,
			DefaultRole = request.Role,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddHours(24)  // default 24h for email invites
		};

		_invitationRepository.Add(invitation);
		await _db.SaveChangesAsync(cancellationToken);

		// Email sending is not implemented yet — future feature
		return ServiceResponse<InvitationDto>.Success(new InvitationDto(
			invitation.Id,
			org.Id,
			org.Name,
			_fileStorage.ResolvePublicUrl(org.LogoStorageKey),
			inviter?.FirstName ?? string.Empty,
			inviter?.LastName ?? string.Empty,
			invitation.Email,
			invitation.DefaultRole,
			invitation.Status,
			invitation.ExpiresAt,
			invitation.CreatedAt,
			token));
	}

}
