using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Queries.GetOrganizationById;

public record GetOrganizationByIdQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse<OrganizationDto>>;

public class GetOrganizationByIdHandler : IRequestHandler<GetOrganizationByIdQuery, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetOrganizationByIdHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		GetOrganizationByIdQuery request, CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.Where(o => o.Id == request.OrganizationId)
			.Select(o => new
			{
				o.Id,
				o.Name,
				o.Slug,
				o.Description,
				o.LogoStorageKey,
				o.IsVerified,
				o.Website,
				o.ContactEmail,
				o.Phone,
				o.OwnerUserId,
				o.CreatedAt,
				MemberCount = o.Members.Count,
				IsMember = o.Members.Any(m => m.UserId == request.CallerDomainUserId)
			})
			.FirstOrDefaultAsync(cancellationToken);

		if (org is null)
			return ServiceResponse<OrganizationDto>.Failure("Організацію не знайдено");

		if (!org.IsMember)
			return ServiceResponse<OrganizationDto>.Failure("Немає доступу до організації");

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, StorageUrlResolver.Resolve(_fileStorage, org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.Phone, org.OwnerUserId,
			org.MemberCount, org.CreatedAt));
	}
}
