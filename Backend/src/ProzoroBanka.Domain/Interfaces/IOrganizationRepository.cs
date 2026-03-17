using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Domain.Interfaces;

/// <summary>
/// Organization repository abstraction for data access.
/// </summary>
public interface IOrganizationRepository
{
	/// <summary>Get organization by ID with eager-loaded relations.</summary>
	Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

	/// <summary>Get organization by slug.</summary>
	Task<Organization?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);

	/// <summary>Get all organizations where user is an active member.</summary>
	Task<IReadOnlyList<Organization>> GetUserOrganizationsAsync(Guid userId, CancellationToken cancellationToken = default);

	/// <summary>Check if user is an active member of organization.</summary>
	Task<bool> IsMemberAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default);

	/// <summary>Get organization with active members loaded.</summary>
	Task<Organization?> GetWithMembersAsync(Guid id, CancellationToken cancellationToken = default);

	/// <summary>Add new organization.</summary>
	void Add(Organization organization);

	/// <summary>Update organization (marks as modified in EF).</summary>
	void Update(Organization organization);

	/// <summary>Delete organization (soft delete via IsDeleted).</summary>
	void Delete(Organization organization);

	/// <summary>Check if slug exists (excluding current org if provided).</summary>
	Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null, CancellationToken cancellationToken = default);
}
