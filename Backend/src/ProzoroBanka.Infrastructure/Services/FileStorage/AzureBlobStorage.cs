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
	private readonly string? _cdnUrl;

	public AzureBlobStorage(string connectionString, string containerName, string? cdnUrl = null)
	{
		_containerClient = new BlobContainerClient(connectionString, containerName);
		_containerClient.CreateIfNotExists(PublicAccessType.None);
		_cdnUrl = cdnUrl?.TrimEnd('/');
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
		if (!string.IsNullOrEmpty(_cdnUrl))
			return $"{_cdnUrl}/{storageKey}";

		return _containerClient.GetBlobClient(storageKey).Uri.ToString();
	}

	public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
	{
		var blobClient = _containerClient.GetBlobClient(storageKey);
		await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
	}
}
