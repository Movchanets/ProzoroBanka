using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetUsers;

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, ServiceResponse<AdminUserListResponse>>
{
	private readonly IApplicationDbContext _context;
	private readonly IUserService _userService;

	public GetUsersQueryHandler(IApplicationDbContext context, IUserService userService)
	{
		_context = context;
		_userService = userService;
	}

	public async Task<ServiceResponse<AdminUserListResponse>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
	{
		var page = Math.Max(1, request.Page);
		var pageSize = Math.Clamp(request.PageSize, 1, 100);

		var query = _context.Users
			.AsNoTracking()
			.Where(u => u.IdentityUserId != null);

		if (request.IsActive.HasValue)
		{
			query = query.Where(u => u.IsActive == request.IsActive.Value);
		}

		if (!string.IsNullOrWhiteSpace(request.Search))
		{
			var search = request.Search.Trim().ToLower();
			query = query.Where(u =>
				u.Email.ToLower().Contains(search) ||
				u.FirstName.ToLower().Contains(search) ||
				u.LastName.ToLower().Contains(search));
		}

		if (!string.IsNullOrWhiteSpace(request.Role))
		{
			var roleFilter = request.Role.Trim();
			var filteredUsers = await query
				.OrderByDescending(x => x.CreatedAt)
				.ToListAsync(cancellationToken);

			var filteredDtos = new List<AdminUserDto>();
			foreach (var user in filteredUsers)
			{
				var profileResponse = await _userService.GetProfileAsync(user.IdentityUserId!.Value, cancellationToken);
				var roles = profileResponse.IsSuccess && profileResponse.Payload != null
					? profileResponse.Payload.Roles
					: new List<string>();

				if (!roles.Any(r => string.Equals(r, roleFilter, StringComparison.OrdinalIgnoreCase)))
				{
					continue;
				}

				filteredDtos.Add(new AdminUserDto(
					Id: user.IdentityUserId.Value,
					DomainUserId: user.Id,
					Email: user.Email,
					FirstName: user.FirstName,
					LastName: user.LastName,
					ProfilePhotoUrl: null,
					IsActive: user.IsActive,
					CreatedAt: user.CreatedAt,
					Roles: roles.ToList()));
			}

			var totalFilteredCount = filteredDtos.Count;
			var pagedFilteredDtos = filteredDtos
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.ToList();

			return ServiceResponse<AdminUserListResponse>.Success(
				new AdminUserListResponse(pagedFilteredDtos, totalFilteredCount, page, pageSize));
		}

		var totalCount = await query.CountAsync(cancellationToken);

		var users = await query
			.OrderByDescending(x => x.CreatedAt)
			.Skip((page - 1) * pageSize)
			.Take(pageSize)
			.ToListAsync(cancellationToken);

		var dtos = new List<AdminUserDto>(users.Count);

		foreach (var user in users)
		{
			var profileResponse = await _userService.GetProfileAsync(user.IdentityUserId!.Value, cancellationToken);
			var roles = profileResponse.IsSuccess && profileResponse.Payload != null
				? profileResponse.Payload.Roles
				: new List<string>();

			dtos.Add(new AdminUserDto(
				Id: user.IdentityUserId.Value,
				DomainUserId: user.Id,
				Email: user.Email,
				FirstName: user.FirstName,
				LastName: user.LastName,
				ProfilePhotoUrl: null,
				IsActive: user.IsActive,
				CreatedAt: user.CreatedAt,
				Roles: roles.ToList()));
		}

		return ServiceResponse<AdminUserListResponse>.Success(
			new AdminUserListResponse(dtos, totalCount, page, pageSize));
	}
}
