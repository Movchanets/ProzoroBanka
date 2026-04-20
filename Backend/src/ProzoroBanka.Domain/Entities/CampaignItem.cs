namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Єдина сутність для всіх куплених товарів (з чеків, накладних, інвойсів).
/// </summary>
public class CampaignItem : BaseEntity
{
    public Guid? CampaignId { get; set; }
    public Campaign? Campaign { get; set; }

    // ── Базові поля товару (спільні для всіх) ──
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Кількість. Може бути дробовою (напр. 1.5 кг або 2.5 літра)
    /// </summary>
    public decimal Quantity { get; set; } 
    
    /// <summary>
    /// Ціна за одиницю (в копійках)
    /// </summary>
    public long UnitPrice { get; set; }
    
    /// <summary>
    /// Загальна вартість рядка (в копійках)
    /// </summary>
    public long TotalPrice { get; set; }

    // ── Поля специфічні для фіскальних чеків (успадковані з ReceiptItem) ──
    public int SortOrder { get; set; }
    public string? Barcode { get; set; }
    public decimal? VatRate { get; set; }
    public decimal? VatAmount { get; set; }

    // ── Звідки взявся цей товар? (Nullable Foreign Keys) ──

    // 1. Якщо товар прийшов з фіскального чека (ДПС)
    public Guid? ReceiptId { get; set; }
    public Receipt? Receipt { get; set; }

    // 2. Якщо товар прийшов з видаткової накладної чи інвойсу (Mistral OCR)
    public Guid? CampaignDocumentId { get; set; }
    public CampaignDocument? CampaignDocument { get; set; }
}
