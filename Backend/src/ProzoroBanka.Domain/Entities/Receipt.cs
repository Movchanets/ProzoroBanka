using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Квитанція (чек), завантажена користувачем.
/// </summary>
public class Receipt : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? CampaignId { get; set; }

    /// <summary>
    /// Ключ у сховищі (storage key), а не публічний URL.
    /// </summary>
    public string StorageKey { get; set; } = string.Empty;

    /// <summary>
    /// Публікація чека в межах збору: чорновик або активний.
    /// </summary>
    public ReceiptPublicationStatus PublicationStatus { get; set; } = ReceiptPublicationStatus.Draft;

    /// <summary>
    /// Ключ зображення чека для публічного перегляду.
    /// </summary>
    public string? ReceiptImageStorageKey { get; set; }

    /// <summary>
    /// Оригінальне ім'я файлу.
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;
    public string? Alias { get; set; }

    public string? MerchantName { get; set; }
    public RegistryReceiptType? RegistryType { get; set; }
    public string? FiscalNumber { get; set; }
    public string? ReceiptCode { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? Currency { get; set; }
    public string? PurchasedItemName { get; set; }
    public DateTime? PurchaseDateUtc { get; set; }
    public DateTime? TransactionDate { get; set; }
    public ReceiptStatus Status { get; set; } = ReceiptStatus.PendingOcr;
    public string? RawOcrJson { get; set; }
    public string? OcrStructuredPayloadJson { get; set; }
    public DateTime? OcrExtractedAtUtc { get; set; }
    public OcrProvider? ParsedBy { get; set; }
    public Guid? MatchedTransactionId { get; set; }
    public string? StateVerificationReference { get; set; }
    public DateTime? StateVerifiedAtUtc { get; set; }
    public string? VerificationFailureReason { get; set; }

    // ── Navigation ──
    public User User { get; set; } = null!;
    public Campaign? Campaign { get; set; }
    public ICollection<ReceiptItemPhoto> ItemPhotos { get; set; } = new List<ReceiptItemPhoto>();
}
