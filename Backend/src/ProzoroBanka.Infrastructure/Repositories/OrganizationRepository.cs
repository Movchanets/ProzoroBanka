using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Infrastructure.Repositories;

public class OrganizationRepository : IOrganizationRepository
{
	private readonly IApplicationDbContext _db;

	public OrganizationRepository(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
	{
		return await _db.Organizations
			.AsNoTracking()
			.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, cancellationToken);
	}

	public async Task<Organization?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
	{
		return await _db.Organizations
			.AsNoTracking()
			.FirstOrDefaultAsync(o => o.Slug == slug && !o.IsDeleted, cancellationToken);
	}

	public async Task<IReadOnlyList<Organization>> GetUserOrganizationsAsync(Guid userId, CancellationToken cancellationToken = default)
	{
		return await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.UserId == userId && !m.IsDeleted)
			.Select(m => m.Organization)
			.Where(o => !o.IsDeleted)
			.Distinct()
			.ToListAsync(cancellationToken);
	}

	public async Task<bool> IsMemberAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default)
	{
		return await _db.OrganizationMembers
			.AnyAsync(m => m.OrganizationId == organizationId && m.UserId == userId && !m.IsDeleted, cancellationToken);
	}

	public async Task<Organization?> GetWithMembersAsync(Guid id, CancellationToken cancellationToken = default)
	{
		return await _db.Organizations
			.Include(o => o.Members.Where(m => !m.IsDeleted))
			.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, cancellationToken);
	}

	public void Add(Organization organization)
	{
		_db.Organizations.Add(organization);
	}

	public void Update(Organization organization)
	{
		_db.Organizations.Update(organization);
	}

	public void Delete(Organization organization)
	{
		organization.IsDeleted = true;
		_db.Organizations.Update(organization);
	}

	public async Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null, CancellationToken cancellationToken = default)
	{
		var query = _db.Organizations.Where(o => o.Slug == slug && !o.IsDeleted);
		if (excludeId.HasValue)
			query = query.Where(o => o.Id != excludeId.Value);
		return await query.AnyAsync(cancellationToken);
	}
}
