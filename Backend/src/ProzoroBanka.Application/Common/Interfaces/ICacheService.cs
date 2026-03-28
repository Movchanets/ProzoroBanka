namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Сервіс для інвалідації кешу за тегами.
/// </summary>
public interface ICacheInvalidationService
{
	/// <summary>
	/// Інвалідує всі записи кешу з вказаним тегом.
	/// </summary>
	Task InvalidateByTagAsync(string tag, CancellationToken cancellationToken = default);

	/// <summary>
	/// Інвалідує всі записи кешу з будь-яким із вказаних тегів.
	/// </summary>
	Task InvalidateByTagsAsync(IEnumerable<string> tags, CancellationToken cancellationToken = default);
}
