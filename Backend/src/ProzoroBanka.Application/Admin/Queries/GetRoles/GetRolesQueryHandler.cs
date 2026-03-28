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
				"receipts.read", "receipts.create", "receipts.update", "receipts.delete", "monobank.read"
			}),
			new("Accountant", "Бухгалтер", new[]
			{
				"receipts.read", "receipts.verify", "reports.read", "reports.export", "monobank.read", "monobank.sync"
			}),
			new("Admin", "Адміністратор", new[]
			{
				"receipts.read", "receipts.create", "receipts.update", "receipts.delete", "receipts.verify",
				"users.read", "users.update", "users.delete", "users.manage_roles",
				"reports.read", "reports.export", "monobank.sync", "monobank.read", "system.settings"
			})
		};

		return Task.FromResult(ServiceResponse<IReadOnlyList<AdminRoleDto>>.Success(roles));
	}
}
