using System;

namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Фотографії/зображення, прикріплені до кампанії (для створення галереї або звіту).
/// </summary>
public class CampaignPhoto : BaseEntity
{
	public Guid CampaignId { get; set; }
	public Guid CreatedByUserId { get; set; }

	/// <summary>
	/// Ключ у сховищі (storage key) для доступу до файлу.
	/// </summary>
	public string StorageKey { get; set; } = string.Empty;

	/// <summary>
	/// Оригінальна назва файлу, якщо потрібно зберегти для завантаження.
	/// </summary>
	public string OriginalFileName { get; set; } = string.Empty;

	/// <summary>
	/// Опційний опис фотографії (наприклад, "Звітна фотографія 1").
	/// </summary>
	public string? Description { get; set; }

	/// <summary>
	/// Порядок відображення фотографії у галереї.
	/// </summary>
	public int SortOrder { get; set; } = 0;

	// ── Navigation ──
	public Campaign Campaign { get; set; } = null!;
	public User CreatedBy { get; set; } = null!;
}
