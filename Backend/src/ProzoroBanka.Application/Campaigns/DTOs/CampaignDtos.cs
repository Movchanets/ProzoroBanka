using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.DTOs;

public record CampaignDto(
	Guid Id,
	string Title,
	string? Description,
	string? CoverImageUrl,
	long GoalAmount,
	long CurrentAmount,
	long WithdrawnAmount,
	long DocumentedAmount,
	double DocumentationPercent,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	string? MonobankAccountId,
	string? SendUrl,
	int ReceiptCount,
	DateTime CreatedAt);

public record CampaignDetailDto(
	Guid Id,
	string Title,
	string? Description,
	string? CoverImageUrl,
	long GoalAmount,
	long CurrentAmount,
	long WithdrawnAmount,
	long DocumentedAmount,
	double DocumentationPercent,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	string? MonobankAccountId,
	string? SendUrl,
	int ReceiptCount,
	Guid OrganizationId,
	string OrganizationName,
	string CreatedByName,
	DateTime CreatedAt);

public record CampaignStatsDto(
	int TotalCampaigns,
	int ActiveCampaigns,
	long TotalRaised,
	long TotalDocumented,
	double DocumentationPercent);

// ── Controller request models ──

public record CreateCampaignRequest(
	string Title,
	string? Description,
	long GoalAmount,
	DateTime? Deadline,
	string? SendUrl);

public record UpdateCampaignRequest(
	string? Title,
	string? Description,
	long? GoalAmount,
	DateTime? Deadline,
	string? SendUrl);

public record ChangeCampaignStatusRequest(
	CampaignStatus NewStatus);

public record UpdateCampaignBalanceRequest(
	long NewCurrentAmount,
	string? Reason);

public record CampaignTransactionDto(
	Guid Id,
	long Amount,
	string? Description,
	DateTime TransactionTimeUtc,
	string Source,
	DateTime CreatedAt);

public record CampaignPhotoDto(
	Guid Id,
	string PhotoUrl,
	string OriginalFileName,
	string? Description,
	int SortOrder,
	DateTime CreatedAt);

public record AddCampaignPhotosRequest(
	List<string>? Descriptions);

public record ReorderCampaignPhotosRequest(
	List<Guid> PhotoIds);

public record UpdateCampaignPhotoRequest(
	string? Description);
