namespace ProzoroBanka.Application.Common.Models;

public sealed record CampaignCreationAllowance(
	bool CanCreate,
	int UsedCampaigns,
	int MaxCampaigns);
