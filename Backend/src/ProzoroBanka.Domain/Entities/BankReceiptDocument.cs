namespace ProzoroBanka.Domain.Entities;

public class BankReceiptDocument : CampaignDocument
{
    public string? SenderIbanOrCard { get; set; }
    public string? Edrpou { get; set; }
    public string? PayerFullName { get; set; }
    
    /// <summary>
    /// Sum of all CampaignItems price (kopecks)
    /// </summary>
    public long TotalItemsAmount { get; set; }
    
    public string? ReceiptCode { get; set; }
    public string? PaymentPurpose { get; set; }
    public string? SenderIban { get; set; }
    public string? ReceiverIban { get; set; }
}
