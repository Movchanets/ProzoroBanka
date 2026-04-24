using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Обробник org-level permission authorization.
/// </summary>
public class OrganizationPermissionAuthorizationHandler : AuthorizationHandler<OrganizationPermissionRequirement>
{
	private readonly ICurrentUserService _currentUserService;
	private readonly IOrganizationAuthorizationService _organizationAuthorizationService;
	private readonly IApplicationDbContext _db;

	public OrganizationPermissionAuthorizationHandler(
		ICurrentUserService currentUserService,
		IOrganizationAuthorizationService organizationAuthorizationService,
		IApplicationDbContext db)
	{
		_currentUserService = currentUserService;
		_organizationAuthorizationService = organizationAuthorizationService;
		_db = db;
	}

	protected override async Task HandleRequirementAsync(
		AuthorizationHandlerContext context,
		OrganizationPermissionRequirement requirement)
	{
		var domainUserId = _currentUserService.DomainUserId;
		if (domainUserId is null)
			return;

		var httpContext = ExtractHttpContext(context.Resource);
		if (httpContext is null)
			return;

		var organizationId = await ResolveOrganizationIdAsync(httpContext, requirement.ContextKey);
		if (organizationId is null)
			return;

		var claimResult = OrganizationPermissionsClaims.Evaluate(
			context.User,
			organizationId.Value,
			requirement.Permission);

		if (claimResult == OrganizationPermissionClaimResult.Granted)
		{
			context.Succeed(requirement);
			return;
		}

		// Only deny if we found a nonzero mask that explicitly lacks the permission.
		// For Unknown or ZeroMask (org has zero permissions in claim), fall back to DB.
		if (claimResult == OrganizationPermissionClaimResult.Denied)
		{
			return;
		}

		// ZeroMask or Unknown: check the database
		var hasPermission = await _organizationAuthorizationService.HasPermission(
			organizationId.Value,
			domainUserId.Value,
			requirement.Permission,
			httpContext.RequestAborted);

		if (hasPermission)
		{
			context.Succeed(requirement);
		}
	}

	private static HttpContext? ExtractHttpContext(object? resource)
	{
		return resource switch
		{
			HttpContext httpContext => httpContext,
			AuthorizationFilterContext filterContext => filterContext.HttpContext,
			_ => null,
		};
	}

	private async Task<Guid?> ResolveOrganizationIdAsync(HttpContext httpContext, string contextKey)
	{
		if (await TryResolveFromContextKeyAsync(httpContext, contextKey) is { } explicitValue)
			return explicitValue;

		if (TryReadRouteGuid(httpContext, "organizationId", out var organizationId))
			return organizationId;

		if (TryReadRouteGuid(httpContext, "id", out organizationId))
			return organizationId;

		if (TryReadRouteGuid(httpContext, "purchaseId", out var purchaseId))
		{
			return await ResolveOrganizationIdByPurchaseIdAsync(purchaseId, httpContext.RequestAborted);
		}

		if (TryReadRouteGuid(httpContext, "documentId", out var documentId))
		{
			return await ResolveOrganizationIdByDocumentIdAsync(documentId, httpContext.RequestAborted);
		}

		return null;
	}

	private async Task<Guid?> TryResolveFromContextKeyAsync(HttpContext httpContext, string contextKey)
	{
		if (string.IsNullOrWhiteSpace(contextKey))
			return null;

		if (contextKey.StartsWith("body.", StringComparison.OrdinalIgnoreCase))
		{
			var bodyKey = contextKey.Substring("body.".Length);
			return await TryReadBodyGuidAsync(httpContext, bodyKey);
		}

		if (TryReadRouteGuid(httpContext, contextKey, out var directRouteGuid))
		{
			if (string.Equals(contextKey, "organizationId", StringComparison.OrdinalIgnoreCase)
				|| string.Equals(contextKey, "id", StringComparison.OrdinalIgnoreCase))
			{
				return directRouteGuid;
			}

			if (string.Equals(contextKey, "purchaseId", StringComparison.OrdinalIgnoreCase))
			{
				return await ResolveOrganizationIdByPurchaseIdAsync(directRouteGuid, httpContext.RequestAborted);
			}

			if (string.Equals(contextKey, "documentId", StringComparison.OrdinalIgnoreCase))
			{
				return await ResolveOrganizationIdByDocumentIdAsync(directRouteGuid, httpContext.RequestAborted);
			}
		}

		return null;
	}

	private async Task<Guid?> ResolveOrganizationIdByPurchaseIdAsync(Guid purchaseId, CancellationToken ct)
	{
		return await _db.CampaignPurchases
			.AsNoTracking()
			.Where(purchase => purchase.Id == purchaseId && !purchase.IsDeleted)
			.Select(purchase => (Guid?)purchase.OrganizationId)
			.FirstOrDefaultAsync(ct);
	}

	private async Task<Guid?> ResolveOrganizationIdByDocumentIdAsync(Guid documentId, CancellationToken ct)
	{
		return await _db.CampaignDocuments
			.AsNoTracking()
			.Where(document => document.Id == documentId && !document.IsDeleted)
			.Select(document => (Guid?)document.Purchase.OrganizationId)
			.FirstOrDefaultAsync(ct);
	}

	private static bool TryReadRouteGuid(HttpContext httpContext, string key, out Guid value)
	{
		value = Guid.Empty;

		if (!httpContext.Request.RouteValues.TryGetValue(key, out var raw)
			|| raw is null)
		{
			return false;
		}

		return Guid.TryParse(raw.ToString(), out value);
	}

	private static async Task<Guid?> TryReadBodyGuidAsync(HttpContext httpContext, string keyPath)
	{
		if (string.IsNullOrWhiteSpace(keyPath))
			return null;

		if (httpContext.Request.ContentLength is null or 0)
			return null;

		if (httpContext.Request.ContentType is null
			|| !httpContext.Request.ContentType.Contains("application/json", StringComparison.OrdinalIgnoreCase))
		{
			return null;
		}

		httpContext.Request.EnableBuffering();
		httpContext.Request.Body.Position = 0;

		try
		{
			using var document = await JsonDocument.ParseAsync(httpContext.Request.Body, cancellationToken: httpContext.RequestAborted);
			if (!TryGetProperty(document.RootElement, keyPath, out var valueElement))
				return null;

			return valueElement.ValueKind switch
			{
				JsonValueKind.String when Guid.TryParse(valueElement.GetString(), out var parsedGuid) => parsedGuid,
				_ => null,
			};
		}
		catch (JsonException)
		{
			return null;
		}
		finally
		{
			httpContext.Request.Body.Position = 0;
		}
	}

	private static bool TryGetProperty(JsonElement root, string keyPath, out JsonElement value)
	{
		value = root;
		var parts = keyPath.Split('.', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

		foreach (var part in parts)
		{
			if (value.ValueKind != JsonValueKind.Object)
			{
				return false;
			}

			JsonElement next = default;
			var found = false;
			foreach (var property in value.EnumerateObject())
			{
				if (!string.Equals(property.Name, part, StringComparison.OrdinalIgnoreCase))
					continue;

				next = property.Value;
				found = true;
				break;
			}

			if (!found)
				return false;

			value = next;
		}

		return true;
	}
}
