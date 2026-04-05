using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Запис про зміну балансу кампанії (ручне оновлення або Monobank webhook-подія).
/// </summary>
public class CampaignTransaction : BaseEntity
{
	public Guid CampaignId { get; set; }

	/// <summary>
	/// Зовнішній ID транзакції (Monobank statement id) для дедуплікації.
	/// Для ручних оновлень — auto-generated GUID string.
	/// </summary>
	public string ExternalTransactionId { get; set; } = string.Empty;

	/// <summary>
	/// Сума в копійках (minor units).
	/// </summary>
	public long Amount { get; set; }

	/// <summary>
	/// Коментар донора або опис транзакції.
	/// </summary>
	public string? Description { get; set; }

	/// <summary>
	/// Час транзакції від провайдера або час ручного введення.
	/// </summary>
	public DateTime TransactionTimeUtc { get; set; }

	/// <summary>
	/// Джерело оновлення балансу.
	/// </summary>
	public BalanceUpdateSource Source { get; set; }

	/// <summary>
	/// Хеш payload (для діагностики без збереження секретів).
	/// </summary>
	public string? ProviderPayloadHash { get; set; }

	// ── Navigation ──
	public Campaign Campaign { get; set; } = null!;
}
