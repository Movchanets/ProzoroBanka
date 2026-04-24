using Microsoft.AspNetCore.Authorization;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Shortcut-атрибут для authorization на рівні організації.
/// Приклад: [HasOrganizationPermission(OrganizationPermissions.ManagePurchases)]
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class HasOrganizationPermissionAttribute : AuthorizeAttribute
{
	public HasOrganizationPermissionAttribute(
		OrganizationPermissions permission,
		string contextKey = "organizationId")
		: base($"OrgPermission:{permission}:{contextKey}")
	{
	}
}
