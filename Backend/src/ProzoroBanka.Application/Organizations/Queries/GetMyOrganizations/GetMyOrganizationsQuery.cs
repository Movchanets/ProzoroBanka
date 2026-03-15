using MediatR;
using Microsoft.EntityFrameworkCore;
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

	public GetMyOrganizationsHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<IReadOnlyList<OrganizationDto>>> Handle(
		GetMyOrganizationsQuery request, CancellationToken cancellationToken)
	{
		var organizations = await _db.OrganizationMembers
			.Where(m => m.UserId == request.CallerDomainUserId)
			.Select(m => new OrganizationDto(
				m.Organization.Id,
				m.Organization.Name,
				m.Organization.Slug,
				m.Organization.Description,
				m.Organization.LogoStorageKey,
				m.Organization.IsVerified,
				m.Organization.Website,
				m.Organization.ContactEmail,
				m.Organization.OwnerUserId,
				m.Organization.Members.Count,
				m.Organization.CreatedAt))
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<OrganizationDto>>.Success(organizations);
	}
}
