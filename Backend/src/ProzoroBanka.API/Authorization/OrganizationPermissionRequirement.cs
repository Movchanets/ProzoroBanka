using Microsoft.AspNetCore.Authorization;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Вимога наявності permission у межах конкретної організації.
/// </summary>
public class OrganizationPermissionRequirement : IAuthorizationRequirement
{
	public OrganizationPermissions Permission { get; }
	public string ContextKey { get; }

	public OrganizationPermissionRequirement(
		OrganizationPermissions permission,
		string contextKey)
	{
		Permission = permission;
		ContextKey = string.IsNullOrWhiteSpace(contextKey)
			? "organizationId"
			: contextKey;
	}
}
