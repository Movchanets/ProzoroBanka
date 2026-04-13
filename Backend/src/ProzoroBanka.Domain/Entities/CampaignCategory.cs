namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Категорія збору для публічної фільтрації та адмінського керування.
/// </summary>
public class CampaignCategory : BaseEntity
{
	public string NameUk { get; set; } = string.Empty;
	public string NameEn { get; set; } = string.Empty;
	public string Slug { get; set; } = string.Empty;
	public int SortOrder { get; set; }
	public bool IsActive { get; set; } = true;

	public ICollection<CampaignCategoryMapping> CampaignMappings { get; set; } = new List<CampaignCategoryMapping>();
}
