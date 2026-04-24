using System.Security.Claims;
using System.Text.Json;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.UnitTests.API.Authorization;

/// <summary>
/// Tests for OrganizationPermissionsClaims evaluation logic.
/// Verifies claim result discrimination:
/// - Unknown: no claim or org not in claim
/// - ZeroMask: org found with permission mask 0 (allows DB fallback)
/// - Granted: org found with required permission
/// - Denied: org found with nonzero mask but lacking permission (blocks DB fallback)
/// </summary>
public class OrganizationPermissionsClaimsTests
{
	private static readonly Guid TestOrgId = Guid.NewGuid();
	private static readonly Guid OtherOrgId = Guid.NewGuid();

	[Fact]
	public void Evaluate_WhenClaimAbsent_ReturnsUnknown()
	{
		var user = new ClaimsPrincipal(new ClaimsIdentity());

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ReadOnly);

		Assert.Equal(OrganizationPermissionClaimResult.Unknown, result);
	}

	[Fact]
	public void Evaluate_WhenOrgNotInClaim_ReturnsUnknown()
	{
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{OtherOrgId:D}", (int)OrganizationPermissions.All }
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ReadOnly);

		Assert.Equal(OrganizationPermissionClaimResult.Unknown, result);
	}

	[Fact]
	public void Evaluate_WhenOrgFoundWithZeroMask_ReturnsZeroMask()
	{
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{TestOrgId:D}", 0 } // Zero permission mask
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ReadOnly);

		Assert.Equal(OrganizationPermissionClaimResult.ZeroMask, result);
	}

	[Fact]
	public void Evaluate_WhenRequiredPermissionIsNone_ReturnsGranted()
	{
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{TestOrgId:D}", (int)OrganizationPermissions.ReadOnly }
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.None);

		Assert.Equal(OrganizationPermissionClaimResult.Granted, result);
	}

	[Fact]
	public void Evaluate_WhenOrgHasRequiredPermission_ReturnsGranted()
	{
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{TestOrgId:D}", (int)OrganizationPermissions.ReadOnly }
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ReadOnly);

		Assert.Equal(OrganizationPermissionClaimResult.Granted, result);
	}

	[Fact]
	public void Evaluate_WhenOrgHasMultiplePermissionsIncludingRequired_ReturnsGranted()
	{
		var mask = OrganizationPermissions.ReadOnly | OrganizationPermissions.ManagePurchases;
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{TestOrgId:D}", (int)mask }
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ManagePurchases);

		Assert.Equal(OrganizationPermissionClaimResult.Granted, result);
	}

	[Fact]
	public void Evaluate_WhenOrgHasNonzeroMaskButLacksRequired_ReturnsDenied()
	{
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{TestOrgId:D}", (int)OrganizationPermissions.ReadOnly }
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ManageOrganization);

		Assert.Equal(OrganizationPermissionClaimResult.Denied, result);
	}

	[Fact]
	public void Evaluate_WhenZeroMaskRequiresReadOnly_StillReturnsZeroMask()
	{
		// Even if requiring ReadOnly, zero mask should return ZeroMask to allow DB fallback
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{TestOrgId:D}", 0 }
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ReadOnly);

		Assert.Equal(OrganizationPermissionClaimResult.ZeroMask, result);
	}

	[Fact]
	public void Evaluate_WithMultipleOrgsInClaim_EvaluatesCorrectOrg()
	{
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ $"org_{OtherOrgId:D}", (int)OrganizationPermissions.All },
			{ $"org_{TestOrgId:D}", (int)OrganizationPermissions.ReadOnly }
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ManageOrganization);

		// TestOrgId has ReadOnly, not ManageOrganization -> Denied
		Assert.Equal(OrganizationPermissionClaimResult.Denied, result);
	}

	[Fact]
	public void Evaluate_WithPrefixedAndUnprefixedKeys_PrefersPrefixed()
	{
		// Test backward compatibility: both prefixed and unprefixed keys can exist
		var payload = JsonSerializer.Serialize(new Dictionary<string, int>
		{
			{ TestOrgId.ToString("D"), (int)OrganizationPermissions.None }, // Unprefixed (old)
			{ $"org_{TestOrgId:D}", (int)OrganizationPermissions.ReadOnly } // Prefixed (new)
		});

		var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
		{
			new Claim("org_permissions", payload)
		}));

		// Should use prefixed version (ReadOnly), not unprefixed (None)
		var result = OrganizationPermissionsClaims.Evaluate(
			user,
			TestOrgId,
			OrganizationPermissions.ReadOnly);

		Assert.Equal(OrganizationPermissionClaimResult.Granted, result);
	}
}
