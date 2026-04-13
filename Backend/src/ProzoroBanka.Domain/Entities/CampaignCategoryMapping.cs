namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// M2M зв'язок між збором і категорією.
/// </summary>
public class CampaignCategoryMapping : BaseEntity
{
	public Guid CampaignId { get; set; }
	public Guid CategoryId { get; set; }

	public Campaign Campaign { get; set; } = null!;
	public CampaignCategory Category { get; set; } = null!;
}
