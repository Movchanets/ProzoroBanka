using System.Security.Claims;
using System.Text.Json;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Authorization;

internal enum OrganizationPermissionClaimResult
{
	Unknown,      // Claim not found or org key not in claim
	ZeroMask,     // Org found in claim but permission mask is 0 (allow DB fallback)
	Granted,      // Org found in claim with required permission
	Denied        // Org found in claim with nonzero mask but lacking required permission
}

internal static class OrganizationPermissionsClaims
{
	private const string ClaimType = "org_permissions";
	private const string OrganizationKeyPrefix = "org_";

	public static OrganizationPermissionClaimResult Evaluate(
		ClaimsPrincipal user,
		Guid organizationId,
		OrganizationPermissions requiredPermission)
	{
		var rawClaim = user.FindFirst(ClaimType)?.Value;
		if (string.IsNullOrWhiteSpace(rawClaim))
			return OrganizationPermissionClaimResult.Unknown;

		if (!TryParsePayload(rawClaim, out var permissionsByOrganization))
			return OrganizationPermissionClaimResult.Unknown;

		if (!TryGetPermissionsMask(permissionsByOrganization, organizationId, out var permissionsMask))
			return OrganizationPermissionClaimResult.Unknown;

		// Organization is in the claim; check if it has a nonzero mask
		if (permissionsMask == OrganizationPermissions.None)
		{
			// Zero mask found in claim: allow DB fallback to decide
			return OrganizationPermissionClaimResult.ZeroMask;
		}

		if (requiredPermission == OrganizationPermissions.None)
			return OrganizationPermissionClaimResult.Granted;

		return (permissionsMask & requiredPermission) == requiredPermission
			? OrganizationPermissionClaimResult.Granted
			: OrganizationPermissionClaimResult.Denied;
	}

	private static bool TryParsePayload(string rawClaim, out Dictionary<string, int> permissionsByOrganization)
	{
		permissionsByOrganization = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

		try
		{
			using var document = JsonDocument.Parse(rawClaim);
			if (document.RootElement.ValueKind != JsonValueKind.Object)
				return false;

			foreach (var property in document.RootElement.EnumerateObject())
			{
				var valueKind = property.Value.ValueKind;
				if (valueKind == JsonValueKind.Number && property.Value.TryGetInt32(out var numericMask))
				{
					permissionsByOrganization[property.Name] = numericMask;
					continue;
				}

				if (valueKind == JsonValueKind.String && int.TryParse(property.Value.GetString(), out var parsedMask))
				{
					permissionsByOrganization[property.Name] = parsedMask;
				}
			}

			return true;
		}
		catch (JsonException)
		{
			return false;
		}
	}

	private static bool TryGetPermissionsMask(
		IReadOnlyDictionary<string, int> permissionsByOrganization,
		Guid organizationId,
		out OrganizationPermissions permissionsMask)
	{
		var guidKey = organizationId.ToString("D");
		var prefixedKey = $"{OrganizationKeyPrefix}{guidKey}";

		permissionsMask = OrganizationPermissions.None;

		if (permissionsByOrganization.TryGetValue(prefixedKey, out var prefixedValue))
		{
			permissionsMask = (OrganizationPermissions)prefixedValue;
			return true;
		}

		if (permissionsByOrganization.TryGetValue(guidKey, out var plainValue))
		{
			permissionsMask = (OrganizationPermissions)plainValue;
			return true;
		}

		return false;
	}
}
