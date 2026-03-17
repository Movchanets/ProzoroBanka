using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UploadOrganizationLogo;

public class UploadOrganizationLogoHandler
	: IRequestHandler<UploadOrganizationLogoCommand, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public UploadOrganizationLogoHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		UploadOrganizationLogoCommand request, CancellationToken cancellationToken)
	{
		await using var fileStream = request.FileStream;

		var org = await _db.Organizations
			.Include(o => o.Members)
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (org is null)
			return ServiceResponse<OrganizationDto>.Failure("Організацію не знайдено");

		var member = org.Members.FirstOrDefault(m => m.UserId == request.CallerDomainUserId);
		if (member is null)
			return ServiceResponse<OrganizationDto>.Failure("Немає доступу до організації");

		if (!member.PermissionsFlags.HasFlag(OrganizationPermissions.UploadLogo))
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

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, ResolvePublicUrl(org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.OwnerUserId,
			org.Members.Count, org.CreatedAt));
	}

	private string? ResolvePublicUrl(string? storageKey)
	{
		if (string.IsNullOrWhiteSpace(storageKey))
			return null;

		return _fileStorage.GetPublicUrl(storageKey);
	}
}
