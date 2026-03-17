namespace ProzoroBanka.Infrastructure.Services.FileStorage;

internal static class StoragePublicUrlBuilder
{
	private const string UploadsSegment = "uploads";

	public static string BuildUploadsUrl(string baseUrl, string storageKey)
	{
		var normalizedBaseUrl = baseUrl.TrimEnd('/');
		var normalizedStorageKey = NormalizeStorageKey(storageKey);

		return $"{normalizedBaseUrl}/{UploadsSegment}/{normalizedStorageKey}";
	}

	public static string NormalizeStorageKey(string storageKey)
	{
		var normalizedStorageKey = storageKey.Trim().TrimStart('/');
		var uploadsPrefix = $"{UploadsSegment}/";

		if (normalizedStorageKey.StartsWith(uploadsPrefix, StringComparison.OrdinalIgnoreCase))
			return normalizedStorageKey[uploadsPrefix.Length..];

		return normalizedStorageKey;
	}
}