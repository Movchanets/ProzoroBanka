using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UpdateOrganization;

public class UpdateOrganizationHandler : IRequestHandler<UpdateOrganizationCommand, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;

	public UpdateOrganizationHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		UpdateOrganizationCommand request, CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.Include(o => o.Members)
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (org is null)
			return ServiceResponse<OrganizationDto>.Failure("Організацію не знайдено");

		var member = org.Members.FirstOrDefault(m => m.UserId == request.CallerDomainUserId);
		if (member is null)
			return ServiceResponse<OrganizationDto>.Failure("Немає доступу до організації");

		if (!member.PermissionsFlags.HasFlag(OrganizationPermissions.ManageOrganization))
			return ServiceResponse<OrganizationDto>.Failure("Недостатньо прав для редагування організації");

		if (request.Name is not null && request.Name != org.Name)
		{
			org.Name = request.Name;
			org.Slug = await GenerateUniqueSlugAsync(request.Name, request.OrganizationId, cancellationToken);
		}

		if (request.Description is not null) org.Description = request.Description;
		if (request.Website is not null) org.Website = request.Website;
		if (request.ContactEmail is not null) org.ContactEmail = request.ContactEmail;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, org.LogoStorageKey,
			org.IsVerified, org.Website, org.ContactEmail, org.OwnerUserId,
			org.Members.Count, org.CreatedAt));
	}

	private async Task<string> GenerateUniqueSlugAsync(string name, Guid excludeId, CancellationToken ct)
	{
		var baseSlug = SlugHelper.Generate(name);
		var slug = baseSlug;
		var counter = 1;

		while (await _db.Organizations.AnyAsync(o => o.Slug == slug && o.Id != excludeId, ct))
			slug = $"{baseSlug}-{counter++}";

		return slug;
	}
}
