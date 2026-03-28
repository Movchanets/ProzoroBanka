using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetUsers;

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, ServiceResponse<AdminUserListResponse>>
{
	private readonly IApplicationDbContext _context;
	private readonly IUserService _userService; // Need to get roles? Wait, IUserService doesn't have GetAllUsers with Roles. 
	                            // Let's just fetch from DB and map. Or use UserManager directly if needed, but Application layer doesn't have UserManager.
	
	public GetUsersQueryHandler(IApplicationDbContext context, IUserService userService)
	{
		_context = context;
		_userService = userService;
	}

	public async Task<ServiceResponse<AdminUserListResponse>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
	{
		var query = _context.Users.AsNoTracking().Where(u => u.IdentityUserId != null);

		var totalCount = await query.CountAsync(cancellationToken);

		var users = await query
			.OrderByDescending(x => x.CreatedAt)
			.Skip((request.Page - 1) * request.PageSize)
			.Take(request.PageSize)
			.ToListAsync(cancellationToken);

		var dtos = new List<AdminUserDto>();

		foreach (var user in users)
		{
			// Need to fetch roles for each user (inefficient for large lists but fine for admin page)
			// Wait, IUserService.GetProfileAsync gets single profile with roles, but it's only for IdentityUserId.
			// Is there a way to query Identity users? ApplicationDbContext.DomainUsers has IdentityUserId.
			var profileResponse = await _userService.GetProfileAsync(user.IdentityUserId.Value, cancellationToken);
			var roles = profileResponse.IsSuccess && profileResponse.Payload != null 
                ? profileResponse.Payload.Roles 
                : new List<string>();

			dtos.Add(new AdminUserDto(
				Id: user.IdentityUserId.Value,     // the identity user id to pass to AssignRoles
				DomainUserId: user.Id,
				Email: user.Email,
				FirstName: user.FirstName,
				LastName: user.LastName,
				ProfilePhotoUrl: null, // we can rely on _userService.GetProfileAsync maybe, but user.ProfilePhotoUrl is mostly managed somewhere else?
				IsActive: user.IsActive,
				CreatedAt: user.CreatedAt,
				Roles: roles.ToList()
			));
		}

		return ServiceResponse<AdminUserListResponse>.Success(
			new AdminUserListResponse(dtos, totalCount, request.Page, request.PageSize));
	}
}
