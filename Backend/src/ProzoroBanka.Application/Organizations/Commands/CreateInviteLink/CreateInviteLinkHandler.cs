using System.Security.Cryptography;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.CreateInviteLink;

public class CreateInviteLinkHandler : IRequestHandler<CreateInviteLinkCommand, ServiceResponse<InvitationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public CreateInviteLinkHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<InvitationDto>> Handle(
		CreateInviteLinkCommand request, CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (org is null)
			return ServiceResponse<InvitationDto>.Failure("Організацію не знайдено");

		var canManage = await _orgAuth.HasPermission(
			request.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageInvitations, cancellationToken);

		if (!canManage)
			return ServiceResponse<InvitationDto>.Failure("Недостатньо прав для створення посилань-запрошень");

		var token = GenerateToken();
		var inviter = await _db.Users
			.AsNoTracking()
			.FirstOrDefaultAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

		var invitation = new Invitation
		{
			OrganizationId = request.OrganizationId,
			InviterId = request.CallerDomainUserId,
			Email = null,    // link invite — no specific email
			Token = token,
			DefaultRole = request.Role,
			Status = InvitationStatus.Pending,
			ExpiresAt = DateTime.UtcNow.AddHours(request.ExpiresInHours)
		};

		_db.Invitations.Add(invitation);
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<InvitationDto>.Success(new InvitationDto(
			invitation.Id,
			org.Id,
			org.Name,
			org.LogoStorageKey,
			inviter?.FirstName ?? string.Empty,
			inviter?.LastName ?? string.Empty,
			null,
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
}
