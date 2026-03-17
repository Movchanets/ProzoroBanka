using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Interfaces;

/// <summary>
/// Invitation repository abstraction for data access.
/// </summary>
public interface IInvitationRepository
{
	/// <summary>Get invitation by ID.</summary>
	Task<Invitation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

	/// <summary>Get invitation by token with eager-loaded relations.</summary>
	Task<Invitation?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);

	/// <summary>Get invitation by token with eager-loaded relations and change tracking enabled.</summary>
	Task<Invitation?> GetTrackedByTokenAsync(string token, CancellationToken cancellationToken = default);

	/// <summary>Get all pending invitations for email.</summary>
	Task<IReadOnlyList<Invitation>> GetPendingForEmailAsync(string email, CancellationToken cancellationToken = default);

	/// <summary>Get all invitations sent by organization (with relations).</summary>
	Task<IReadOnlyList<Invitation>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);

	/// <summary>Check if active pending invitation exists for email in org.</summary>
	Task<bool> HasPendingEmailInviteAsync(Guid organizationId, string email, CancellationToken cancellationToken = default);

	/// <summary>Add new invitation.</summary>
	void Add(Invitation invitation);

	/// <summary>Update invitation (marks as modified in EF).</summary>
	void Update(Invitation invitation);

	/// <summary>Delete invitation (soft delete via IsDeleted).</summary>
	void Delete(Invitation invitation);
}
