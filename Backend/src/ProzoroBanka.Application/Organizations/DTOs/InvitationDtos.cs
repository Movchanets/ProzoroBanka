using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.DTOs;

/// <summary>
/// Публічне представлення запрошення. Token присутній тільки для адмінських операцій.
/// </summary>
public record InvitationDto(
	Guid Id,
	Guid OrganizationId,
	string OrganizationName,
	string? OrganizationLogoStorageKey,
	string InviterFirstName,
	string InviterLastName,
	string? Email,
	OrganizationRole Role,
	InvitationStatus Status,
	DateTime ExpiresAt,
	DateTime CreatedAt,
	string? Token
);

// ── Controller request models ──

public record CreateInviteLinkRequest(
	OrganizationRole Role,
	int ExpiresInHours = 24
);

public record InviteByEmailRequest(
	string Email,
	OrganizationRole Role
);
