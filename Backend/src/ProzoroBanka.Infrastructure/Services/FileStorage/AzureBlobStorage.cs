using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.FileStorage;

/// <summary>
/// Azure Blob Storage реалізація IFileStorage.
/// </summary>
public class AzureBlobStorage : IFileStorage
{
	private readonly BlobContainerClient _containerClient;
	private readonly string _publicBaseUrl;

	public AzureBlobStorage(string connectionString, string containerName, string? cdnUrl = null)
	{
		_containerClient = new BlobContainerClient(connectionString, containerName);
		_containerClient.CreateIfNotExists(PublicAccessType.None);

		var blobHostBaseUrl = $"{_containerClient.Uri.Scheme}://{_containerClient.Uri.Host}";
		_publicBaseUrl = ResolvePublicBaseUrl(cdnUrl, blobHostBaseUrl);
	}

	public async Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
	{
		var extension = Path.GetExtension(fileName);
		var storageKey = $"{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}{extension}";

		var blobClient = _containerClient.GetBlobClient(storageKey);
		await blobClient.UploadAsync(fileStream, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: cancellationToken);

		return storageKey;
	}

	public string GetPublicUrl(string storageKey)
	{
		return StoragePublicUrlBuilder.BuildUploadsUrl(_publicBaseUrl, storageKey);
	}

	public async Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
	{
		var blobClient = _containerClient.GetBlobClient(storageKey);
		var download = await blobClient.DownloadStreamingAsync(cancellationToken: cancellationToken);
		return download.Value.Content;
	}

	public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
	{
		var blobClient = _containerClient.GetBlobClient(storageKey);
		await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
	}

	private static string ResolvePublicBaseUrl(string? configuredBaseUrl, string fallbackBaseUrl)
	{
		if (string.IsNullOrWhiteSpace(configuredBaseUrl))
			return fallbackBaseUrl;

		if (!Uri.TryCreate(configuredBaseUrl, UriKind.Absolute, out var parsedUri))
			return fallbackBaseUrl;

		if (!parsedUri.Host.Contains(".blob.", StringComparison.OrdinalIgnoreCase))
			return fallbackBaseUrl;

		return $"{parsedUri.Scheme}://{parsedUri.Host}";
	}
}
