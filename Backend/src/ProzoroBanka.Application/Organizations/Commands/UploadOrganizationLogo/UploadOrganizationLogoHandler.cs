using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UploadOrganizationLogo;

public class UploadOrganizationLogoHandler
	: IRequestHandler<UploadOrganizationLogoCommand, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public UploadOrganizationLogoHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		UploadOrganizationLogoCommand request, CancellationToken cancellationToken)
	{
		await using var fileStream = request.FileStream;

		var access = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			requiredPermission: OrganizationPermissions.UploadLogo,
			ct: cancellationToken);

		if (!access.IsSuccess)
			return ServiceResponse<OrganizationDto>.Failure(access.Message);

		var org = access.Payload!.Organization;

		// Remove previous logo if exists
		if (!string.IsNullOrEmpty(org.LogoStorageKey))
		{
			await _fileStorage.DeleteAsync(org.LogoStorageKey, cancellationToken);
		}

		var storageKey = await _fileStorage.UploadAsync(
			fileStream, request.FileName, request.ContentType, cancellationToken);

		org.LogoStorageKey = storageKey;
		await _db.SaveChangesAsync(cancellationToken);

		var membersCount = await _db.OrganizationMembers
			.CountAsync(m => m.OrganizationId == org.Id && !m.IsDeleted, cancellationToken);

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, _fileStorage.ResolvePublicUrl(org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.Phone, org.OwnerUserId,
			membersCount, org.CreatedAt, org.PlanType));
	}
}
