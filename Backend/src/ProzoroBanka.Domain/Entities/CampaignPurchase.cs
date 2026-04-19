using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Логічна закупівля в рамках збору (наприклад, "Купівля 5 дронів").
/// Одна закупівля може містити декілька документів різних типів.
/// </summary>
public class CampaignPurchase : BaseEntity
{
	public Guid OrganizationId { get; set; }
	public Guid? CampaignId { get; set; }
	public Guid CreatedByUserId { get; set; }

	/// <summary>
	/// Назва закупівлі (наприклад, "5x DJI Mavic 3T").
	/// </summary>
	public string Title { get; set; } = string.Empty;

	/// <summary>
	/// Загальна сума закупівлі (копійки).
	/// </summary>
	public long TotalAmount { get; set; }

	public PurchaseStatus Status { get; set; } = PurchaseStatus.PaymentSent;

	// ── Navigation ──
	public Organization Organization { get; set; } = null!;
	public Campaign? Campaign { get; set; }
	public User CreatedBy { get; set; } = null!;
	public ICollection<CampaignDocument> Documents { get; set; } = new List<CampaignDocument>();
}
