namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Транзакція з Monobank API, синхронізована фоновим воркером.
/// </summary>
public class MonobankTransaction : BaseEntity
{
    public Guid UserId { get; set; }

    /// <summary>
    /// Зовнішній ID транзакції з Monobank.
    /// </summary>
    public string ExternalId { get; set; } = string.Empty;

    /// <summary>
    /// Сума в копійках (як повертає Monobank API).
    /// </summary>
    public long Amount { get; set; }

    public DateTime Time { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? MerchantName { get; set; }

    /// <summary>
    /// Merchant Category Code.
    /// </summary>
    public int Mcc { get; set; }

    /// <summary>
    /// Залишок після транзакції (в копійках).
    /// </summary>
    public long? Balance { get; set; }

    // ── Navigation ──
    public User User { get; set; } = null!;
}
