using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Збір коштів у рамках організації.
/// </summary>
public class Campaign : BaseEntity
{
	public Guid OrganizationId { get; set; }
	public Guid CreatedByUserId { get; set; }

	public string Title { get; set; } = string.Empty;
	public string? Description { get; set; }
	public string? CoverImageStorageKey { get; set; }

	/// <summary>
	/// Фінансова ціль збору (копійки).
	/// </summary>
	public long GoalAmount { get; set; }

	/// <summary>
	/// Поточна зібрана сума (копійки). Оновлюється вручну (Фаза 3) або через sync (Фаза 07).
	/// </summary>
	public long CurrentAmount { get; set; }

	public CampaignStatus Status { get; set; } = CampaignStatus.Draft;
	public DateTime? StartDate { get; set; }
	public DateTime? Deadline { get; set; }

	/// <summary>
	/// Monobank Account/Jar ID (опційно, для Фази 07 автосинхронізації).
	/// </summary>
	public string? MonobankAccountId { get; set; }

	/// <summary>
	/// Публічне посилання на банку Monobank (може бути встановлене вручну або згенероване з sendId).
	/// </summary>
	public string? SendUrl { get; set; }

	// ── Navigation ──
	public Organization Organization { get; set; } = null!;
	public User CreatedBy { get; set; } = null!;
	public ICollection<CampaignTransaction> Transactions { get; set; } = new List<CampaignTransaction>();
	public ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();
	public ICollection<CampaignPhoto> Photos { get; set; } = new List<CampaignPhoto>();
}
