using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Квитанція (чек), завантажена користувачем.
/// </summary>
public class Receipt : BaseEntity
{
    public Guid UserId { get; set; }

    /// <summary>
    /// Ключ у сховищі (storage key), а не публічний URL.
    /// </summary>
    public string StorageKey { get; set; } = string.Empty;

    /// <summary>
    /// Оригінальне ім'я файлу.
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    public string? MerchantName { get; set; }
    public decimal? TotalAmount { get; set; }
    public DateTime? TransactionDate { get; set; }
    public ReceiptStatus Status { get; set; } = ReceiptStatus.Uploaded;
    public string? RawOcrJson { get; set; }
    public OcrProvider? ParsedBy { get; set; }
    public Guid? MatchedTransactionId { get; set; }

    // ── Navigation ──
    public User User { get; set; } = null!;
}
