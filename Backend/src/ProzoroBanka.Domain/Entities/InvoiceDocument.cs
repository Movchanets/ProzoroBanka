namespace ProzoroBanka.Domain.Entities;

public class InvoiceDocument : CampaignDocument
{
    public ICollection<CampaignItem> Items { get; set; } = new List<CampaignItem>();
}
