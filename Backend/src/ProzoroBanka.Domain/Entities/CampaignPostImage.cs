using System;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Зображення, прикріплене до поста кампанії.
/// </summary>
public class CampaignPostImage : BaseEntity
{
	public Guid CampaignPostId { get; set; }

	public string StorageKey { get; set; } = string.Empty;
	public string OriginalFileName { get; set; } = string.Empty;
	public int SortOrder { get; set; } = 0;

	public CampaignPost CampaignPost { get; set; } = null!;
}
