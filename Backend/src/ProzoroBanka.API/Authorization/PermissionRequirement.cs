using Microsoft.AspNetCore.Authorization;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Вимога наявності конкретного дозволу.
/// </summary>
public class PermissionRequirement : IAuthorizationRequirement
{
	public string Permission { get; }

	public PermissionRequirement(string permission)
	{
		Permission = permission;
	}
}
