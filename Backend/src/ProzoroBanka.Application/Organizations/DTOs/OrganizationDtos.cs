using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.DTOs;

public record OrganizationDto(
	Guid Id,
	string Name,
	string Slug,
	string? Description,
	string? LogoUrl,
	bool IsVerified,
	string? Website,
	string? ContactEmail,
	string? Phone,
	Guid OwnerUserId,
	int MemberCount,
	DateTime CreatedAt,
	OrganizationPlanType PlanType
);

public record OrganizationPlanUsageDto(
	OrganizationPlanType PlanType,
	int MaxCampaigns,
	int CurrentCampaigns,
	int MaxMembers,
	int CurrentMembers,
	int MaxOcrExtractionsPerMonth,
	int CurrentOcrExtractionsPerMonth
);

public record StateRegistryCredentialSummaryDto(
	RegistryProvider Provider,
	bool IsConfigured,
	string? MaskedKey,
	DateTime? LastValidatedAtUtc,
	DateTime? LastUsedAtUtc);

public record OrganizationStateRegistrySettingsDto(
	StateRegistryCredentialSummaryDto TaxService,
	StateRegistryCredentialSummaryDto CheckGovUa,
	int StateVerificationConfiguredKeys,
	int StateVerificationMaxKeys,
	int CurrentOcrExtractionsPerMonth,
	int MaxOcrExtractionsPerMonth);

public record OrganizationMemberDto(
	Guid UserId,
	string FirstName,
	string LastName,
	string Email,
	OrganizationRole Role,
	OrganizationPermissions PermissionsFlags,
	DateTime JoinedAt,
	string? AvatarUrl = null
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
	string? ContactEmail,
	string? Phone
);

public record UpdateMemberRoleRequest(
	OrganizationRole NewRole,
	OrganizationPermissions NewPermissionsFlags
);
