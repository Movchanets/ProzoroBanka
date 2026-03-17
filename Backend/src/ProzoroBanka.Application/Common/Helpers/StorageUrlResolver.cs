using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Application.Common.Helpers;

/// <summary>
/// Centralizes storage-key to public-URL translation so handlers do not duplicate
/// the same null/whitespace checks and stay focused on business logic.
/// </summary>
public static class StorageUrlResolver
{
	public static string? Resolve(IFileStorage fileStorage, string? storageKey)
	{
		if (string.IsNullOrWhiteSpace(storageKey))
			return null;

		return fileStorage.GetPublicUrl(storageKey);
	}
}