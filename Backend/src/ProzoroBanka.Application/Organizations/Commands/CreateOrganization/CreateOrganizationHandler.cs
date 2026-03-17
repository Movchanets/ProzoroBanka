using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Organizations.Commands.CreateOrganization;

public class CreateOrganizationHandler : IRequestHandler<CreateOrganizationCommand, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public CreateOrganizationHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		CreateOrganizationCommand request, CancellationToken cancellationToken)
	{
		var userExists = await _db.Users
			.AnyAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

		if (!userExists)
			return ServiceResponse<OrganizationDto>.Failure("Користувача не знайдено");

		var slug = await GenerateUniqueSlugAsync(request.Name, null, cancellationToken);

		var org = new Organization
		{
			Name = request.Name,
			Slug = slug,
			Description = request.Description,
			Website = request.Website,
			ContactEmail = request.ContactEmail,
			OwnerUserId = request.CallerDomainUserId
		};

		_db.Organizations.Add(org);
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, ResolvePublicUrl(org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.OwnerUserId, 1, org.CreatedAt));
	}

	private async Task<string> GenerateUniqueSlugAsync(string name, Guid? excludeId, CancellationToken ct)
	{
		var baseSlug = SlugHelper.Generate(name);
		var slug = baseSlug;
		var counter = 1;

		while (await _db.Organizations.AnyAsync(
			o => o.Slug == slug && (excludeId == null || o.Id != excludeId.Value), ct))
		{
			slug = $"{baseSlug}-{counter++}";
		}

		return slug;
	}

	private string? ResolvePublicUrl(string? storageKey)
	{
		if (string.IsNullOrWhiteSpace(storageKey))
			return null;

		return _fileStorage.GetPublicUrl(storageKey);
	}
}
