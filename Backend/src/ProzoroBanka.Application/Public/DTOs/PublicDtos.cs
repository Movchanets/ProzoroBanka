using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.DTOs;

public record PublicListResponse<T>(
	IReadOnlyList<T> Items,
	int Page,
	int PageSize,
	int TotalCount);

public record PublicTeamMemberDto(
	Guid UserId,
	string FirstName,
	string LastName,
	string? AvatarUrl);

public record PublicOrganizationDto(
	Guid Id,
	string Name,
	string Slug,
	string? Description,
	string? LogoUrl,
	bool IsVerified,
	string? Website,
	int MemberCount,
	int ActiveCampaignCount,
	long TotalRaised,
	IReadOnlyList<PublicTeamMemberDto> TeamMembers);

public record PublicCampaignDto(
	Guid Id,
	string TitleUk,
	string TitleEn,
	string? Description,
	string? CoverImageUrl,
	string? SendUrl,
	long GoalAmount,
	long CurrentAmount,
	long DocumentedAmount,
	double DocumentationPercent,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	IReadOnlyList<PublicCampaignCategoryDto> Categories,
	int ReceiptCount,
	string OrganizationName,
	string OrganizationSlug,
	bool OrganizationVerified);

public record PublicCampaignCategoryDto(
	Guid Id,
	string NameUk,
	string NameEn,
	string Slug);

public record PublicCampaignDetailDto(
	Guid Id,
	string TitleUk,
	string TitleEn,
	string? Description,
	string? CoverImageUrl,
	string? SendUrl,
	long GoalAmount,
	long CurrentAmount,
	long DocumentedAmount,
	double DocumentationPercent,
	CampaignStatus Status,
	DateTime? StartDate,
	DateTime? Deadline,
	double ProgressPercentage,
	int? DaysRemaining,
	Guid OrganizationId,
	string OrganizationName,
	string OrganizationSlug,
	IReadOnlyList<PublicCampaignCategoryDto> Categories,
	IReadOnlyList<PublicReceiptDto> LatestReceipts,
	IReadOnlyList<PublicCampaignPostDto> Posts);

public record PublicCampaignPostDto(
	Guid Id,
	string? Description,
	string? ImageUrl,
	DateTime CreatedAt);

public record PublicReceiptDto(
	Guid Id,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? TransactionDate,
	string? AddedByName);

public record PublicReceiptDetailDto(
	Guid Id,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? TransactionDate,
	string Status,
	string ImageUrl,
	string? StructuredOutputJson,
	IReadOnlyList<PublicReceiptItemDto> Items,
	IReadOnlyList<PublicReceiptItemPhotoDto> ItemPhotos,
	string? AddedByName,
	Guid? CampaignId,
	string? CampaignTitle,
	string? OrganizationName,
	string? OrganizationSlug,
	string? VerificationUrl,
	bool IsConfirmed);

public record PublicReceiptItemDto(
	Guid Id,
	string Name,
	decimal? Quantity,
	decimal? UnitPrice,
	decimal? TotalPrice,
	string? Barcode,
	decimal? VatRate,
	decimal? VatAmount,
	int SortOrder);

public record PublicReceiptItemPhotoDto(
	Guid Id,
	Guid? ReceiptItemId,
	string OriginalFileName,
	string PhotoUrl,
	int SortOrder);

public record TransparencyCategoryDto(
	string Name,
	decimal Amount,
	double Percentage);

public record TransparencyMonthlyDto(
	string Month,
	decimal Amount);

public record TransparencyDto(
	decimal TotalSpent,
	IReadOnlyList<TransparencyCategoryDto> Categories,
	IReadOnlyList<TransparencyMonthlyDto> MonthlySpendings,
	int ReceiptCount,
	int VerifiedReceiptCount);
