namespace ProzoroBanka.Application.Common.Models;

public sealed class OrganizationPlansOptions
{
	public const string SectionName = "OrganizationPlans";
	public const string NonAdminOrganizationLimitSettingKey = "users.non_admin.max_owned_organizations";
	public const string NonAdminJoinedOrganizationsLimitSettingKey = "users.non_admin.max_joined_organizations";
	public const string FreeMaxCampaignsSettingKey = "plans.free.max_campaigns";
	public const string FreeMaxMembersSettingKey = "plans.free.max_members";
	public const string FreeMaxOcrExtractionsSettingKey = "plans.free.max_ocr_extractions_per_month";
	public const string PaidMaxCampaignsSettingKey = "plans.paid.max_campaigns";
	public const string PaidMaxMembersSettingKey = "plans.paid.max_members";
	public const string PaidMaxOcrExtractionsSettingKey = "plans.paid.max_ocr_extractions_per_month";

	public OrganizationPlanLimits Free { get; set; } = new();
	public OrganizationPlanLimits Paid { get; set; } = new();
	public int MaxOwnedOrganizationsForNonAdmin { get; set; } = 10;
	public int MaxJoinedOrganizationsForNonAdmin { get; set; } = 20;
}

public sealed class OrganizationPlanLimits
{
	public int MaxCampaigns { get; set; }
	public int MaxMembers { get; set; }
	public int MaxOcrExtractionsPerMonth { get; set; }
}
