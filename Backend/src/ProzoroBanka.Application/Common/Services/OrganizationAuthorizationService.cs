using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

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
			.Select(m => new { m.Role })
			.FirstOrDefaultAsync(ct);

		if (membership is null) return false;
		// Owner=0, Admin=1, Reporter=2 — lower value = higher privilege
		return (int)membership.Role <= (int)minRole;
	}

	public async Task<bool> HasPermission(Guid orgId, Guid userId, OrganizationPermissions permission, CancellationToken ct = default)
	{
		var membership = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == orgId && m.UserId == userId && !m.IsDeleted)
			.Select(m => new { m.Role, m.PermissionsFlags })
			.FirstOrDefaultAsync(ct);

		if (membership is null) return false;
		if (membership.Role == OrganizationRole.Owner) return true;
		return membership.PermissionsFlags.HasFlag(permission);
	}
}
