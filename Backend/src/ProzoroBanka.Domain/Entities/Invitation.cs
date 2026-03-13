using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Запрошення до організації — link-based або email-based.
/// </summary>
public class Invitation : BaseEntity
{
	public Guid OrganizationId { get; set; }

	/// <summary>Хто створив запрошення (domain user ID).</summary>
	public Guid InviterId { get; set; }

	/// <summary>Email одержувача, null для link-invite.</summary>
	public string? Email { get; set; }

	/// <summary>Унікальний крипто-токен запрошення.</summary>
	public string Token { get; set; } = string.Empty;

	/// <summary>Роль, яку отримає юзер при вступі.</summary>
	public OrganizationRole DefaultRole { get; set; }

	public InvitationStatus Status { get; set; } = InvitationStatus.Pending;
	public DateTime ExpiresAt { get; set; }

	// ── Navigation properties ──
	public Organization Organization { get; set; } = null!;
	public User Inviter { get; set; } = null!;
}
