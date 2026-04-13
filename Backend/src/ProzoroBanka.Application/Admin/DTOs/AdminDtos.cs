using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Admin.DTOs;

/// <summary>
/// Організація для адмін-панелі: містить додаткову інформацію порівняно з публічним DTO.
/// </summary>
public record AdminOrganizationDto(
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
	string OwnerName,
	string OwnerEmail,
	int MemberCount,
	int CampaignCount,
	long TotalRaised,
	DateTime CreatedAt,
	OrganizationPlanType PlanType);

/// <summary>
/// Вхідна модель з пагінацією для списку організацій.
/// </summary>
public record AdminOrganizationListResponse(
	IReadOnlyList<AdminOrganizationDto> Items,
	int TotalCount,
	int Page,
	int PageSize);

/// <summary>
/// Збори для адмін-панелі.
/// </summary>
public record AdminCampaignDto(
	Guid Id,
	string TitleUk,
	string TitleEn,
	string? Description,
	string? CoverImageUrl,
	long GoalAmount,
	long CurrentAmount,
	string? SendUrl,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	IReadOnlyList<AdminCampaignCategoryDto> Categories,
	string OrganizationName,
	string CreatedByName,
	DateTime CreatedAt);

public record AdminCampaignCategoryDto(
	Guid Id,
	string NameUk,
	string NameEn,
	string Slug,
	int SortOrder,
	bool IsActive);

public record AdminCreateCampaignCategoryRequest(
	string NameUk,
	string NameEn,
	string Slug,
	int SortOrder,
	bool IsActive);

public record AdminUpdateCampaignCategoryRequest(
	string NameUk,
	string NameEn,
	string Slug,
	int SortOrder,
	bool IsActive);

/// <summary>
/// Request для верифікації організації адміном.
/// </summary>
public record VerifyOrganizationRequest(bool IsVerified);

/// <summary>
/// Request для зміни статусу збору адміном.
/// </summary>
public record AdminChangeCampaignStatusRequest(CampaignStatus NewStatus);

/// <summary>
/// Користувач системи (для адмінки).
/// ID збігається з IdentityUserId.
/// </summary>
public record AdminUserDto(
	Guid Id,
	Guid DomainUserId,
	string Email,
	string FirstName,
	string LastName,
	string? ProfilePhotoUrl,
	bool IsActive,
	DateTime CreatedAt,
	IList<string> Roles);

public record AdminUserOrganizationLinkDto(
	Guid OrganizationId,
	string OrganizationName,
	string OrganizationSlug,
	bool IsVerified,
	OrganizationPlanType PlanType,
	OrganizationRole Role,
	OrganizationPermissions Permissions,
	DateTime JoinedAt,
	bool IsOwner);

public record AdminUserDetailsDto(
	Guid Id,
	Guid DomainUserId,
	string Email,
	string FirstName,
	string LastName,
	string? PhoneNumber,
	string? ProfilePhotoUrl,
	bool IsActive,
	DateTime CreatedAt,
	IList<string> Roles,
	IReadOnlyList<AdminUserOrganizationLinkDto> Organizations);

/// <summary>
/// Відповідь списку користувачів.
/// </summary>
public record AdminUserListResponse(
	IReadOnlyList<AdminUserDto> Items,
	int TotalCount,
	int Page,
	int PageSize);

/// <summary>
/// Запит для зміни ролей користувача.
/// </summary>
public record AdminAssignRolesRequest(IEnumerable<string> Roles);

/// <summary>
/// Запит для блокування/розблокування користувача.
/// </summary>
public record AdminSetUserLockoutRequest(bool Locked);

public record AdminUpdateUserOrganizationLinkRequest(
	OrganizationRole Role,
	OrganizationPermissions Permissions);

public record AdminUserLimitsSettingsDto(int MaxOwnedOrganizationsForNonAdmin);

public record AdminUpdateUserLimitsSettingsRequest(int MaxOwnedOrganizationsForNonAdmin);

public record AdminPlanLimitsDto(
	int MaxCampaigns,
	int MaxMembers,
	int MaxOcrExtractionsPerMonth);

public record AdminPlansSettingsDto(
	AdminPlanLimitsDto Free,
	AdminPlanLimitsDto Paid);

public record AdminUpdatePlansSettingsRequest(
	AdminPlanLimitsDto Free,
	AdminPlanLimitsDto Paid);

public record AdminGeneralSettingsDto(
	int MaxOwnedOrganizationsForNonAdmin,
	int MaxJoinedOrganizationsForNonAdmin);

public record AdminUpdateGeneralSettingsRequest(
	int MaxOwnedOrganizationsForNonAdmin,
	int MaxJoinedOrganizationsForNonAdmin);
