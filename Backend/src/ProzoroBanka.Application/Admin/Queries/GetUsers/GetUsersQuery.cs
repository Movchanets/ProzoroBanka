using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetUsers;

public record GetUsersQuery(int Page = 1, int PageSize = 20) : IRequest<ServiceResponse<AdminUserListResponse>>;
