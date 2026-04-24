using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetRoles;

public class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, ServiceResponse<IReadOnlyList<AdminRoleDto>>>
{
	public Task<ServiceResponse<IReadOnlyList<AdminRoleDto>>> Handle(GetRolesQuery request, CancellationToken cancellationToken)
	{
		// Hardcode or get from somewhere. This logic mirrors ApplicationRoleDefinitions.All.
		var roles = new List<AdminRoleDto>
		{
			new("Volunteer", "Волонтер", new[]
			{
				"users.self", "invitation.accept"
			}),
			new("Moderator", "Модератор", new[]
			{
				"users.self", "invitation.accept", "users.read", "users.update", "users.delete", "users.manage_roles", "users.impersonate"
			}),
			new("Accountant", "Бухгалтер", new[]
			{
				"users.self", "invitation.accept"
			}),
			new("Admin", "Адміністратор", new[]
			{
				"users.self", "invitation.accept", "system.settings", "organizations.manage", "organizations.plan.manage"
			})
		};

		return Task.FromResult(ServiceResponse<IReadOnlyList<AdminRoleDto>>.Success(roles));
	}
}
