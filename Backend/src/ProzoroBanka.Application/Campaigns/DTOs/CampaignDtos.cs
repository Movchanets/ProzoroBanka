using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.DTOs;

public record CampaignDto(
	Guid Id,
	string Title,
	string? Description,
	string? CoverImageUrl,
	decimal GoalAmount,
	decimal CurrentAmount,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	string? MonobankAccountId,
	DateTime CreatedAt);

public record CampaignDetailDto(
	Guid Id,
	string Title,
	string? Description,
	string? CoverImageUrl,
	decimal GoalAmount,
	decimal CurrentAmount,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	string? MonobankAccountId,
	Guid OrganizationId,
	string OrganizationName,
	string CreatedByName,
	DateTime CreatedAt);

public record CampaignStatsDto(
	int TotalCampaigns,
	int ActiveCampaigns,
	decimal TotalRaised);

// ── Controller request models ──

public record CreateCampaignRequest(
	string Title,
	string? Description,
	decimal GoalAmount,
	DateTime? Deadline);

public record UpdateCampaignRequest(
	string? Title,
	string? Description,
	decimal? GoalAmount,
	DateTime? Deadline);

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
