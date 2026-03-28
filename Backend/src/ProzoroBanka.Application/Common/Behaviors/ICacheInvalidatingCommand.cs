namespace ProzoroBanka.Application.Common.Behaviors;

/// <summary>
/// Marker interface для команд, що мають інвалідувати кеш після успішного виконання.
/// Реалізуйте на command-record щоб автоматично видаляти відповідний кеш.
/// </summary>
public interface ICacheInvalidatingCommand
{
	/// <summary>
	/// Теги кешу для інвалідації після успішного виконання команди.
	/// Стандартні теги: "organizations", "campaigns", "public-organizations", "public-campaigns", "admin"
	/// </summary>
	IEnumerable<string> CacheTags { get; }
}
