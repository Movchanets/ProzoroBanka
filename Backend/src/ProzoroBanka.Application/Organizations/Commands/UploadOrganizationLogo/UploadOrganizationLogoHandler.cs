using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
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

		var org = await _db.Organizations
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, cancellationToken);

		if (org is null)
			return ServiceResponse<OrganizationDto>.Failure("Організацію не знайдено");

		var callerIsMember = await _orgAuth.IsMember(request.OrganizationId, request.CallerDomainUserId, cancellationToken);
		if (!callerIsMember)
			return ServiceResponse<OrganizationDto>.Failure("Немає доступу до організації");

		var canUploadLogo = await _orgAuth.HasPermission(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.UploadLogo,
			cancellationToken);

		if (!canUploadLogo)
			return ServiceResponse<OrganizationDto>.Failure("Недостатньо прав для завантаження логотипу");

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
			org.Id, org.Name, org.Slug, org.Description, StorageUrlResolver.Resolve(_fileStorage, org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.Phone, org.OwnerUserId,
			membersCount, org.CreatedAt));
	}
}
