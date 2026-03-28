using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetRoles;

public record AdminRoleDto(string Name, string Description, IReadOnlyCollection<string> Permissions);

public record GetRolesQuery() : IRequest<ServiceResponse<IReadOnlyList<AdminRoleDto>>>;
