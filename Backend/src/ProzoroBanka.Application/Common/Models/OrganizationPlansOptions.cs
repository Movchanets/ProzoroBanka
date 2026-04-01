namespace ProzoroBanka.Application.Common.Models;

public sealed class OrganizationPlansOptions
{
	public const string SectionName = "OrganizationPlans";

	public OrganizationPlanLimits Free { get; set; } = new();
	public OrganizationPlanLimits Paid { get; set; } = new();
}

public sealed class OrganizationPlanLimits
{
	public int MaxCampaigns { get; set; }
	public int MaxMembers { get; set; }
	public int MaxOcrExtractionsPerMonth { get; set; }
}
