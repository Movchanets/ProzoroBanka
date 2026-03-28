namespace ProzoroBanka.Application.Common;

/// <summary>
/// Стандартні теги для Output Cache. Використовуються в OutputCache policies і в ICacheInvalidatingCommand.
/// </summary>
public static class CacheTag
{
	/// <summary>Організації (публічні та внутрішні).</summary>
	public const string Organizations = "organizations";

	/// <summary>Збори (публічні та внутрішні).</summary>
	public const string Campaigns = "campaigns";

	/// <summary>Чеки.</summary>
	public const string Receipts = "receipts";

	/// <summary>Адмін-панель.</summary>
	public const string Admin = "admin";
}
