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
	decimal TotalRaised,
	DateTime CreatedAt);

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
	string Title,
	string? Description,
	string? CoverImageUrl,
	decimal GoalAmount,
	decimal CurrentAmount,
	string? SendUrl,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	string OrganizationName,
	string CreatedByName,
	DateTime CreatedAt);

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
