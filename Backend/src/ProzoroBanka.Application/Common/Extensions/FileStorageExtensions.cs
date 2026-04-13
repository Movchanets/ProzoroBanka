using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Application.Common.Extensions;

public static class FileStorageExtensions
{
    public static string? ResolvePublicUrl(this IFileStorage fileStorage, string? storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
            return null;

        return fileStorage.GetPublicUrl(storageKey);
    }
}
