using System;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Публічний пост-оновлення кампанії з контентом редактора та медіа.
/// </summary>
public class CampaignPost : BaseEntity
{
	public Guid CampaignId { get; set; }
	public Guid CreatedByUserId { get; set; }

	/// <summary>
	/// JSON-документ Tiptap.
	/// </summary>
	public string? PostContentJson { get; set; }

	public int SortOrder { get; set; } = 0;

	public Campaign Campaign { get; set; } = null!;
	public User CreatedBy { get; set; } = null!;
	public ICollection<CampaignPostImage> Images { get; set; } = new List<CampaignPostImage>();
}
