using Microsoft.AspNetCore.Authorization;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Shortcut-атрибут для permission-based авторизації.
/// Використання: [HasPermission(Permissions.ReceiptsRead)]
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class HasPermissionAttribute : AuthorizeAttribute
{
	public HasPermissionAttribute(string permission)
		: base($"Permission:{permission}")
	{
	}
}
