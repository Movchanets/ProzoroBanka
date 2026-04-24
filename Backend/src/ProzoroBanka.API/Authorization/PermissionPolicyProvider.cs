using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Dynamic policy provider: будь-який policy з префіксом "Permission:" → PermissionRequirement.
/// Використання: [Authorize(Policy = "Permission:receipts.read")]
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
	private const string PolicyPrefix = "Permission:";
	private const string OrganizationPolicyPrefix = "OrgPermission:";
	private readonly DefaultAuthorizationPolicyProvider _fallbackPolicyProvider;

	public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
	{
		_fallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
	}

	public Task<AuthorizationPolicy> GetDefaultPolicyAsync()
		=> _fallbackPolicyProvider.GetDefaultPolicyAsync();

	public Task<AuthorizationPolicy?> GetFallbackPolicyAsync()
		=> _fallbackPolicyProvider.GetFallbackPolicyAsync();

	public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
	{
		if (policyName.StartsWith(PolicyPrefix, StringComparison.OrdinalIgnoreCase))
		{
			var permission = policyName.Substring(PolicyPrefix.Length);
			var policy = new AuthorizationPolicyBuilder()
				.AddRequirements(new PermissionRequirement(permission))
				.Build();
			return Task.FromResult<AuthorizationPolicy?>(policy);
		}

		if (policyName.StartsWith(OrganizationPolicyPrefix, StringComparison.OrdinalIgnoreCase))
		{
			var payload = policyName.Substring(OrganizationPolicyPrefix.Length);
			var parts = payload.Split(':', 2, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

			if (parts.Length == 0
				|| !Enum.TryParse<OrganizationPermissions>(parts[0], ignoreCase: true, out var organizationPermission))
			{
				return Task.FromResult<AuthorizationPolicy?>(null);
			}

			var contextKey = parts.Length > 1 ? parts[1] : "organizationId";
			var policy = new AuthorizationPolicyBuilder()
				.AddRequirements(new OrganizationPermissionRequirement(organizationPermission, contextKey))
				.Build();

			return Task.FromResult<AuthorizationPolicy?>(policy);
		}

		return _fallbackPolicyProvider.GetPolicyAsync(policyName);
	}
}
