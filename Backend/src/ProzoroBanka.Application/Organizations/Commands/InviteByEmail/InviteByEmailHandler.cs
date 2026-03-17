using System.Security.Cryptography;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.InviteByEmail;

public class InviteByEmailHandler : IRequestHandler<InviteByEmailCommand, ServiceResponse<InvitationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public InviteByEmailHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
	{
		_db = db;
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

		// Check for existing pending invitation to the same email in this org
		var existing = await _db.Invitations
			.AnyAsync(i =>
				i.OrganizationId == request.OrganizationId &&
				i.Email == request.Email.ToLowerInvariant() &&
				i.Status == InvitationStatus.Pending,
			cancellationToken);

		if (existing)
			return ServiceResponse<InvitationDto>.Failure("Активне запрошення для цього email вже існує");

		var inviter = await _db.Users
			.AsNoTracking()
			.FirstOrDefaultAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

		var token = GenerateToken();

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

		_db.Invitations.Add(invitation);
		await _db.SaveChangesAsync(cancellationToken);

		// Email sending is not implemented yet — future feature
		return ServiceResponse<InvitationDto>.Success(new InvitationDto(
			invitation.Id,
			org.Id,
			org.Name,
			ResolvePublicUrl(org.LogoStorageKey),
			inviter?.FirstName ?? string.Empty,
			inviter?.LastName ?? string.Empty,
			invitation.Email,
			invitation.DefaultRole,
			invitation.Status,
			invitation.ExpiresAt,
			invitation.CreatedAt,
			token));
	}

	private static string GenerateToken()
	{
		var bytes = new byte[32];
		RandomNumberGenerator.Fill(bytes);
		return Convert.ToBase64String(bytes)
			.Replace('+', '-')
			.Replace('/', '_')
			.TrimEnd('=');
	}

	private string? ResolvePublicUrl(string? storageKey)
	{
		if (string.IsNullOrWhiteSpace(storageKey))
			return null;

		return _fileStorage.GetPublicUrl(storageKey);
	}
}
