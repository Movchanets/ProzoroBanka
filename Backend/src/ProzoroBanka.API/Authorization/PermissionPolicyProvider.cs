using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Dynamic policy provider: будь-який policy з префіксом "Permission:" → PermissionRequirement.
/// Використання: [Authorize(Policy = "Permission:receipts.read")]
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
	private const string PolicyPrefix = "Permission:";
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

		return _fallbackPolicyProvider.GetPolicyAsync(policyName);
	}
}
