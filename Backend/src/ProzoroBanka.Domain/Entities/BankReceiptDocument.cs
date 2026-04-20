namespace ProzoroBanka.Domain.Entities;

public class BankReceiptDocument : CampaignDocument
{
    public string? Edrpou { get; set; }
    public string? PayerFullName { get; set; }

    public string? ReceiptCode { get; set; }
    public string? PaymentPurpose { get; set; }
    public string? SenderIban { get; set; }
    public string? ReceiverIban { get; set; }
}
