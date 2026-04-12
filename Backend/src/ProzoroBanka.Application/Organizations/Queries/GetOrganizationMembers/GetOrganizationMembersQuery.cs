using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Queries.GetOrganizationMembers;

public record GetOrganizationMembersQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse<IReadOnlyList<OrganizationMemberDto>>>;

public class GetOrganizationMembersHandler
	: IRequestHandler<GetOrganizationMembersQuery, ServiceResponse<IReadOnlyList<OrganizationMemberDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetOrganizationMembersHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<OrganizationMemberDto>>> Handle(
		GetOrganizationMembersQuery request, CancellationToken cancellationToken)
	{
		var orgExists = await _db.Organizations
			.AnyAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (!orgExists)
			return ServiceResponse<IReadOnlyList<OrganizationMemberDto>>.Failure("Організацію не знайдено");

		var callerIsMember = await _db.OrganizationMembers
			.AnyAsync(m => m.OrganizationId == request.OrganizationId
						   && m.UserId == request.CallerDomainUserId, cancellationToken);

		if (!callerIsMember)
			return ServiceResponse<IReadOnlyList<OrganizationMemberDto>>.Failure("Немає доступу до організації");

		var members = await _db.OrganizationMembers
			.Where(m => m.OrganizationId == request.OrganizationId)
			.Select(m => new
			{
				m.UserId,
				m.User.FirstName,
				m.User.LastName,
				m.User.Email,
				m.Role,
				m.PermissionsFlags,
				m.JoinedAt,
				m.User.ProfilePhotoStorageKey
			})
			.ToListAsync(cancellationToken);

		var mappedMembers = members.Select(m => new OrganizationMemberDto(
				m.UserId,
				m.FirstName,
				m.LastName,
				m.Email,
				m.Role,
				m.PermissionsFlags,
				m.JoinedAt,
				_fileStorage.ResolvePublicUrl(m.ProfilePhotoStorageKey)))
			.ToList();

		return ServiceResponse<IReadOnlyList<OrganizationMemberDto>>.Success(mappedMembers);
	}
}
