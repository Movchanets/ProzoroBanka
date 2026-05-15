using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.DTOs;

public record CampaignDto(
	Guid Id,
	string TitleUk,
	string TitleEn,
	string? Description,
	string? CoverImageUrl,
	decimal GoalAmount,
	decimal CurrentAmount,
	decimal WithdrawnAmount,
	decimal DocumentedAmount,
	double DocumentationPercent,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	string? MonobankAccountId,
	string? SendUrl,
	IReadOnlyList<CampaignCategoryDto> Categories,
	int ReceiptCount,
	DateTime CreatedAt);

public record CampaignDetailDto(
	Guid Id,
	string TitleUk,
	string TitleEn,
	string? Description,
	string? CoverImageUrl,
	decimal GoalAmount,
	decimal CurrentAmount,
	decimal WithdrawnAmount,
	decimal DocumentedAmount,
	double DocumentationPercent,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	string? MonobankAccountId,
	string? SendUrl,
	IReadOnlyList<CampaignCategoryDto> Categories,
	int ReceiptCount,
	Guid OrganizationId,
	string OrganizationName,
	string CreatedByName,
	DateTime CreatedAt);

public record CampaignCategoryDto(
	Guid Id,
	string NameUk,
	string NameEn,
	string Slug,
	int SortOrder,
	bool IsActive);

public record CampaignStatsDto(
	int TotalCampaigns,
	int ActiveCampaigns,
	decimal TotalRaised,
	decimal TotalDocumented,
	double DocumentationPercent);

// ── Controller request models ──

public record CreateCampaignRequest(
	string TitleUk,
	string TitleEn,
	string? Description,
	decimal GoalAmount,
	DateTime? Deadline,
	IReadOnlyList<Guid>? CategoryIds,
	string? SendUrl);

public record UpdateCampaignRequest(
	string? TitleUk,
	string? TitleEn,
	string? Description,
	decimal? GoalAmount,
	DateTime? Deadline,
	IReadOnlyList<Guid>? CategoryIds,
	string? SendUrl);

public record ChangeCampaignStatusRequest(
	CampaignStatus NewStatus);

public record UpdateCampaignBalanceRequest(
	decimal NewCurrentAmount,
	string? Reason);

public record CampaignTransactionDto(
	Guid Id,
	decimal Amount,
	string? Description,
	DateTime TransactionTimeUtc,
	string Source,
	DateTime CreatedAt);

public record CampaignPhotoDto(
	Guid Id,
	string PhotoUrl,
	string OriginalFileName,
	string? Description,
	bool IsCover,
	int SortOrder,
	DateTime CreatedAt);

public record CampaignPostImageDto(
	Guid Id,
	string ImageUrl,
	string OriginalFileName,
	int SortOrder);

public record CampaignPostDto(
	Guid Id,
	string? PostContentJson,
	IReadOnlyList<CampaignPostImageDto> Images,
	DateTime CreatedAt,
	DateTime? UpdatedAt);

public record AddCampaignPhotosRequest(
	List<string>? Descriptions);

public record ReorderCampaignPhotosRequest(
	List<Guid> PhotoIds);

public record UpdateCampaignPhotoRequest(
	string? Description,
	bool SetAsCover = false);

public record CreateCampaignPostRequest(
	string? PostContentJson);

public record UpdateCampaignPostRequest(
	string? PostContentJson,
	List<Guid>? RemoveImageIds,
	List<Guid>? ImageOrderIds);
