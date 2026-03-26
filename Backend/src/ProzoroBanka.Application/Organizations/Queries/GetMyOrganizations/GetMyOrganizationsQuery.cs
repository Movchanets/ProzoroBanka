using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Queries.GetMyOrganizations;

public record GetMyOrganizationsQuery(
	Guid CallerDomainUserId) : IRequest<ServiceResponse<IReadOnlyList<OrganizationDto>>>;

public class GetMyOrganizationsHandler
	: IRequestHandler<GetMyOrganizationsQuery, ServiceResponse<IReadOnlyList<OrganizationDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetMyOrganizationsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<OrganizationDto>>> Handle(
		GetMyOrganizationsQuery request, CancellationToken cancellationToken)
	{
		var organizations = await _db.OrganizationMembers
			.Where(m => m.UserId == request.CallerDomainUserId)
			.Select(m => new
			{
				m.Organization.Id,
				m.Organization.Name,
				m.Organization.Slug,
				m.Organization.Description,
				m.Organization.LogoStorageKey,
				m.Organization.IsVerified,
				m.Organization.Website,
				m.Organization.ContactEmail,
				m.Organization.Phone,
				m.Organization.OwnerUserId,
				MemberCount = m.Organization.Members.Count,
				m.Organization.CreatedAt
			})
			.ToListAsync(cancellationToken);

		var result = organizations
			.Select(org => new OrganizationDto(
				org.Id,
				org.Name,
				org.Slug,
				org.Description,
				StorageUrlResolver.Resolve(_fileStorage, org.LogoStorageKey),
				org.IsVerified,
				org.Website,
				org.ContactEmail,
				org.Phone,
				org.OwnerUserId,
				org.MemberCount,
				org.CreatedAt))
			.ToList();

		return ServiceResponse<IReadOnlyList<OrganizationDto>>.Success(result);
	}
}
