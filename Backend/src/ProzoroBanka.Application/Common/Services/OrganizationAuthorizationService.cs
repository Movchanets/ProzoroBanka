using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Services;

/// <summary>
/// Реалізація IOrganizationAuthorizationService через IApplicationDbContext.
/// </summary>
public class OrganizationAuthorizationService : IOrganizationAuthorizationService
{
	private readonly IApplicationDbContext _db;

	public OrganizationAuthorizationService(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<OrganizationMember?> GetMembership(Guid orgId, Guid userId, CancellationToken ct = default)
		=> await _db.OrganizationMembers
			.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == userId && !m.IsDeleted, ct);

	public async Task<bool> IsMember(Guid orgId, Guid userId, CancellationToken ct = default)
		=> await _db.OrganizationMembers
			.AnyAsync(m => m.OrganizationId == orgId && m.UserId == userId && !m.IsDeleted, ct);

	public async Task<bool> HasRole(Guid orgId, Guid userId, OrganizationRole minRole, CancellationToken ct = default)
	{
		var membership = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == orgId && m.UserId == userId && !m.IsDeleted)
			.Select(m => new { m.Role, m.Organization.IsBlocked })
			.FirstOrDefaultAsync(ct);

		if (membership is null || membership.IsBlocked) return false;
		// Owner=0, Admin=1, Reporter=2 — lower value = higher privilege
		return (int)membership.Role <= (int)minRole;
	}

	public async Task<bool> HasPermission(Guid orgId, Guid userId, OrganizationPermissions permission, CancellationToken ct = default)
	{
		var membership = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == orgId && m.UserId == userId && !m.IsDeleted)
			.Select(m => new { m.Role, m.PermissionsFlags, m.Organization.IsBlocked })
			.FirstOrDefaultAsync(ct);

		if (membership is null || membership.IsBlocked) return false;
		if (membership.Role == OrganizationRole.Owner) return true;

		if (membership.Role == OrganizationRole.Admin) return true;

		return membership.PermissionsFlags.HasFlag(permission);
	}

	public async Task<ServiceResponse<OrganizationAccessContext>> EnsureOrganizationAccessAsync(
		Guid orgId,
		Guid userId,
		OrganizationPermissions? requiredPermission = null,
		OrganizationRole? minRole = null,
		CancellationToken ct = default)
	{
		var data = await _db.OrganizationMembers
			.Include(m => m.Organization)
				.ThenInclude(o => o.Members)
			.FirstOrDefaultAsync(m => m.OrganizationId == orgId && m.UserId == userId && !m.IsDeleted, ct);

		if (data?.Organization is null || data.Organization.IsDeleted)
			return ServiceResponse<OrganizationAccessContext>.Failure("Організацію не знайдено");

		if (data.Organization.IsBlocked && (requiredPermission.HasValue || minRole.HasValue))
			return ServiceResponse<OrganizationAccessContext>.Failure("Організацію заблоковано. Зміни заборонені.");

		if (minRole.HasValue && (int)data.Role > (int)minRole.Value)
			return ServiceResponse<OrganizationAccessContext>.Failure("Недостатньо прав.");

		if (requiredPermission.HasValue && data.Role != OrganizationRole.Owner && data.Role != OrganizationRole.Admin)
		{
			if (!data.PermissionsFlags.HasFlag(requiredPermission.Value))
				return ServiceResponse<OrganizationAccessContext>.Failure("Недостатньо прав.");
		}

		return ServiceResponse<OrganizationAccessContext>.Success(new OrganizationAccessContext(data.Organization, data));
	}
}
