namespace ProzoroBanka.Domain.Entities;

public class WaybillDocument : CampaignDocument
{
    public ICollection<CampaignItem> Items { get; set; } = new List<CampaignItem>();
}
