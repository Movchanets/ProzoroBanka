namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Позиція товару в межах одного чека.
/// </summary>
public class ReceiptItem : BaseEntity
{
    public Guid ReceiptId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? TotalPrice { get; set; }
    public string? Barcode { get; set; }
    public decimal? VatRate { get; set; }
    public decimal? VatAmount { get; set; }
    public int SortOrder { get; set; }

    public Receipt Receipt { get; set; } = null!;
    public ICollection<ReceiptItemPhoto> Photos { get; set; } = new List<ReceiptItemPhoto>();
}
