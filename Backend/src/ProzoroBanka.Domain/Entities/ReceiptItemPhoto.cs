namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Фото придбаного товару, прикріплене до чека.
/// </summary>
public class ReceiptItemPhoto : BaseEntity
{
    public Guid ReceiptId { get; set; }
    public Guid? CampaignItemId { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public Receipt Receipt { get; set; } = null!;
    public CampaignItem? CampaignItem { get; set; }
}
