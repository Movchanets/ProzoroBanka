using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Членство користувача в організації.
/// </summary>
public class OrganizationMember : BaseEntity
{
	public Guid OrganizationId { get; set; }
	public Guid UserId { get; set; }

	public OrganizationRole Role { get; set; }
	public OrganizationPermissions PermissionsFlags { get; set; }
	public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

	public Organization Organization { get; set; } = null!;
	public User User { get; set; } = null!;
}
