using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Результат зіставлення чека з транзакцією Monobank.
/// </summary>
public class MatchResult : BaseEntity
{
	public Guid ReceiptId { get; set; }
	public Guid MonobankTransactionId { get; set; }
	public MatchConfidence Confidence { get; set; }

	/// <summary>
	/// Значення подібності (0.0 – 1.0).
	/// </summary>
	public double Score { get; set; }

	/// <summary>
	/// Чи підтверджений користувачем (для Draft).
	/// </summary>
	public bool? IsApproved { get; set; }

	// ── Navigation ──
	public Receipt Receipt { get; set; } = null!;
	public MonobankTransaction MonobankTransaction { get; set; } = null!;
}
