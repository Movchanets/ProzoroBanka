using Microsoft.AspNetCore.Authorization;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Обробник permission-based авторизації.
/// Перевіряє наявність claim "permission" з потрібним значенням.
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
	protected override Task HandleRequirementAsync(
		AuthorizationHandlerContext context,
		PermissionRequirement requirement)
	{
		var permissions = context.User.Claims
			.Where(c => c.Type == "permission")
			.Select(c => c.Value);

		if (permissions.Contains(requirement.Permission, StringComparer.OrdinalIgnoreCase))
		{
			context.Succeed(requirement);
		}

		return Task.CompletedTask;
	}
}
