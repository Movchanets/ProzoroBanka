using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

public class OrganizationStateRegistryCredential : BaseEntity
{
	public Guid OrganizationId { get; set; }
	public Guid CreatedByUserId { get; set; }
	public RegistryProvider Provider { get; set; }

	public string EncryptedApiKey { get; set; } = string.Empty;
	public string KeyFingerprint { get; set; } = string.Empty;
	public bool IsActive { get; set; } = true;

	public DateTime? LastValidatedAtUtc { get; set; }
	public DateTime? LastUsedAtUtc { get; set; }
	public DateTime? BlockedUntilUtc { get; set; }

	public Organization Organization { get; set; } = null!;
	public User CreatedByUser { get; set; } = null!;
}