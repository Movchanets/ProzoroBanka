using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.InvitationSupport;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Application.Organizations.Commands.CreateInviteLink;

public class CreateInviteLinkHandler : IRequestHandler<CreateInviteLinkCommand, ServiceResponse<InvitationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IInvitationRepository _invitationRepository;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public CreateInviteLinkHandler(
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

		var token = InvitationTokenGenerator.Generate();
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

		_invitationRepository.Add(invitation);
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<InvitationDto>.Success(new InvitationDto(
			invitation.Id,
			org.Id,
			org.Name,
			StorageUrlResolver.Resolve(_fileStorage, org.LogoStorageKey),
			inviter?.FirstName ?? string.Empty,
			inviter?.LastName ?? string.Empty,
			null,
			invitation.DefaultRole,
			invitation.Status,
			invitation.ExpiresAt,
			invitation.CreatedAt,
			token));
	}

}
