using Amazon.S3;
using Amazon.S3.Model;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.FileStorage;

/// <summary>
/// AWS S3 / Cloudflare R2 / MinIO реалізація IFileStorage.
/// Підтримує всі S3-сумісні провайдери через конфігурацію.
/// </summary>
public class AwsS3Storage : IFileStorage
{
	private readonly IAmazonS3 _s3Client;
	private readonly string _bucketName;
	private readonly string? _publicUrl;

	public AwsS3Storage(IAmazonS3 s3Client, string bucketName, string? publicUrl = null)
	{
		_s3Client = s3Client;
		_bucketName = bucketName;
		_publicUrl = publicUrl?.TrimEnd('/');
	}

	public async Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
	{
		var extension = Path.GetExtension(fileName);
		var storageKey = $"{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}{extension}";

		var request = new PutObjectRequest
		{
			BucketName = _bucketName,
			Key = storageKey,
			InputStream = fileStream,
			ContentType = contentType,
		};

		await _s3Client.PutObjectAsync(request, cancellationToken);
		return storageKey;
	}

	public string GetPublicUrl(string storageKey)
	{
		var baseUrl = $"https://{_bucketName}.s3.amazonaws.com";

		if (!string.IsNullOrEmpty(_publicUrl))
			baseUrl = _publicUrl;

		return StoragePublicUrlBuilder.BuildUploadsUrl(baseUrl, storageKey);
	}

	public async Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
	{
		using var response = await _s3Client.GetObjectAsync(_bucketName, storageKey, cancellationToken);
		var memoryStream = new MemoryStream();
		await response.ResponseStream.CopyToAsync(memoryStream, cancellationToken);
		memoryStream.Position = 0;
		return memoryStream;
	}

	public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
	{
		await _s3Client.DeleteObjectAsync(_bucketName, storageKey, cancellationToken);
	}
}
