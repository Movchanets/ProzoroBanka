using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetUserDetails;

public record GetUserDetailsQuery(Guid UserId) : IRequest<ServiceResponse<AdminUserDetailsDto>>;

public class GetUserDetailsQueryHandler : IRequestHandler<GetUserDetailsQuery, ServiceResponse<AdminUserDetailsDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IUserService _userService;
	private readonly IFileStorage _fileStorage;

	public GetUserDetailsQueryHandler(IApplicationDbContext db, IUserService userService, IFileStorage fileStorage)
	{
		_db = db;
		_userService = userService;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<AdminUserDetailsDto>> Handle(GetUserDetailsQuery request, CancellationToken cancellationToken)
	{
		var user = await _db.Users
			.AsNoTracking()
			.Where(entity => entity.IdentityUserId == request.UserId)
			.Select(entity => new
			{
				entity.Id,
				IdentityUserId = entity.IdentityUserId,
				entity.Email,
				entity.FirstName,
				entity.LastName,
				entity.PhoneNumber,
				entity.ProfilePhotoStorageKey,
				entity.IsActive,
				entity.CreatedAt,
				Organizations = entity.OrganizationMemberships
					.Where(membership => !membership.IsDeleted)
					.OrderBy(membership => membership.Organization.Name)
					.Select(membership => new AdminUserOrganizationLinkDto(
						membership.OrganizationId,
						membership.Organization.Name,
						membership.Organization.Slug,
						membership.Organization.IsVerified,
						membership.Organization.PlanType,
						membership.Role,
						membership.PermissionsFlags,
						membership.JoinedAt,
						membership.Organization.OwnerUserId == entity.Id))
					.ToList()
			})
			.FirstOrDefaultAsync(cancellationToken);

		if (user is null || user.IdentityUserId is null)
			return ServiceResponse<AdminUserDetailsDto>.Failure("Користувача не знайдено");

		var profileResponse = await _userService.GetProfileAsync(user.IdentityUserId.Value, cancellationToken);
		var roles = profileResponse.IsSuccess && profileResponse.Payload is not null
			? profileResponse.Payload.Roles
			: [];

		return ServiceResponse<AdminUserDetailsDto>.Success(new AdminUserDetailsDto(
			user.IdentityUserId.Value,
			user.Id,
			user.Email,
			user.FirstName,
			user.LastName,
			user.PhoneNumber,
			StorageUrlResolver.Resolve(_fileStorage, user.ProfilePhotoStorageKey),
			user.IsActive,
			user.CreatedAt,
			roles,
			user.Organizations));
	}
}
