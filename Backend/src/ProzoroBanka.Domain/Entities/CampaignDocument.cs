using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Базова сутність документа, прикріпленого до закупівлі.
/// Використовує TPH (Table-Per-Hierarchy).
/// </summary>
public abstract class CampaignDocument : BaseEntity
{
    public Guid PurchaseId { get; set; }
    public Guid UploadedByUserId { get; set; }

    public DocumentType Type { get; set; }

    /// <summary>
    /// Ключ файлу у сховищі (blob storage).
    /// </summary>
    public string StorageKey { get; set; } = string.Empty;

    public string OriginalFileName { get; set; } = string.Empty;
    public DateTime? DocumentDate { get; set; }

    public long? Amount { get; set; }

    public string? CounterpartyName { get; set; }

    /// <summary>
    /// Стан OCR.
    /// </summary>
    public OcrProcessingStatus OcrProcessingStatus { get; set; } = OcrProcessingStatus.NotProcessed;

    /// <summary>
    /// Сирі результати OCR.
    /// </summary>
    public string? OcrRawResult { get; set; }

    /// <summary>
    /// true, коли користувач підтвердив дані (ручне або після OCR).
    /// </summary>
    public bool IsDataVerifiedByUser { get; set; }

    // ── Navigation ──
    public CampaignPurchase Purchase { get; set; } = null!;
    public User UploadedBy { get; set; } = null!;
}

public class OtherDocument : CampaignDocument { }
