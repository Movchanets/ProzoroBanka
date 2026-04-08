using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Організація, в межах якої працює команда волонтерів.
/// </summary>
public class Organization : BaseEntity
{
	public string Name { get; set; } = string.Empty;
	public string Slug { get; set; } = string.Empty;
	public string? Description { get; set; }
	public string? LogoStorageKey { get; set; }
	public bool IsVerified { get; set; }
	public string? Website { get; set; }
	public string? ContactEmail { get; set; }
	public string? Phone { get; set; }

	public Guid OwnerUserId { get; set; }
	public User OwnerUser { get; set; } = null!;

	public OrganizationPlanType PlanType { get; set; } = OrganizationPlanType.Free;
	public DateTime? PlanChangedAtUtc { get; set; }
	public Guid? PlanChangedByUserId { get; set; }

	public ICollection<OrganizationMember> Members { get; set; } = new List<OrganizationMember>();
	public ICollection<Invitation> Invitations { get; set; } = new List<Invitation>();
	public ICollection<Campaign> Campaigns { get; set; } = new List<Campaign>();
	public ICollection<OrganizationStateRegistryCredential> StateRegistryCredentials { get; set; } = new List<OrganizationStateRegistryCredential>();
}
