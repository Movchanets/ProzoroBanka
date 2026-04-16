using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Interfaces;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UpdateOrganization;

public class UpdateOrganizationHandler : IRequestHandler<UpdateOrganizationCommand, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationRepository _organizationRepository;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public UpdateOrganizationHandler(
		IApplicationDbContext db,
		IOrganizationRepository organizationRepository,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_organizationRepository = organizationRepository;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		UpdateOrganizationCommand request, CancellationToken cancellationToken)
	{
		var access = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			requiredPermission: OrganizationPermissions.ManageOrganization,
			ct: cancellationToken);

		if (!access.IsSuccess)
			return ServiceResponse<OrganizationDto>.Failure(access.Message);

		var org = access.Payload!.Organization;

		if (request.Name is not null && request.Name != org.Name)
		{
			org.Name = request.Name;
			org.Slug = await GenerateUniqueSlugAsync(request.Name, request.OrganizationId, cancellationToken);
		}

		if (request.Description is not null) org.Description = request.Description;
		if (request.Website is not null) org.Website = request.Website;
		if (request.ContactEmail is not null) org.ContactEmail = request.ContactEmail;
		if (request.Phone is not null) org.Phone = request.Phone;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, _fileStorage.ResolvePublicUrl(org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.Phone, org.OwnerUserId,
			org.Members.Count, org.CreatedAt, org.PlanType));
	}

	private async Task<string> GenerateUniqueSlugAsync(string name, Guid excludeId, CancellationToken ct)
	{
		var baseSlug = SlugHelper.Generate(name);
		var slug = baseSlug;
		var counter = 1;

		while (await _organizationRepository.SlugExistsAsync(slug, excludeId, ct))
			slug = $"{baseSlug}-{counter++}";

		return slug;
	}

}
