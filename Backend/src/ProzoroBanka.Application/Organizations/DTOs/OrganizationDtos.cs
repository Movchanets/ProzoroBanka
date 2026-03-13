using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.DTOs;

public record OrganizationDto(
	Guid Id,
	string Name,
	string Slug,
	string? Description,
	string? LogoStorageKey,
	bool IsVerified,
	string? Website,
	string? ContactEmail,
	Guid OwnerUserId,
	int MemberCount,
	DateTime CreatedAt
);

public record OrganizationMemberDto(
	Guid UserId,
	string FirstName,
	string LastName,
	string Email,
	OrganizationRole Role,
	OrganizationPermissions PermissionsFlags,
	DateTime JoinedAt
);

// ── Controller request models ──

public record CreateOrganizationRequest(
	string Name,
	string? Description,
	string? Website,
	string? ContactEmail
);

public record UpdateOrganizationRequest(
	string? Name,
	string? Description,
	string? Website,
	string? ContactEmail
);
