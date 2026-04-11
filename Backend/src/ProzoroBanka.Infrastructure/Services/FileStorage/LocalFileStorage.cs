using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.FileStorage;

/// <summary>
/// Локальне файлове сховище (wwwroot/uploads). Для розробки.
/// </summary>
public class LocalFileStorage : IFileStorage
{
	private readonly LocalStorageSettings _settings;
	private readonly IHttpContextAccessor _httpContextAccessor;
	private readonly ILogger<LocalFileStorage> _logger;

	public LocalFileStorage(
		IOptions<LocalStorageSettings> settings,
		IHttpContextAccessor httpContextAccessor,
		ILogger<LocalFileStorage> logger)
	{
		_settings = settings.Value;
		_httpContextAccessor = httpContextAccessor;
		_logger = logger;
		Directory.CreateDirectory(_settings.BasePath);
	}

	public async Task<string> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
	{
		var extension = Path.GetExtension(fileName);
		var storageKey = $"{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}{extension}";
		var fullPath = Path.Combine(_settings.BasePath, storageKey.Replace('/', Path.DirectorySeparatorChar));

		var directory = Path.GetDirectoryName(fullPath)!;
		Directory.CreateDirectory(directory);

		await using var outputStream = File.Create(fullPath);
		await fileStream.CopyToAsync(outputStream, cancellationToken);

		_logger.LogDebug("File uploaded to local storage: {StorageKey}", storageKey);

		return storageKey;
	}

	public string GetPublicUrl(string storageKey)
	{
		var normalizedStorageKey = StoragePublicUrlBuilder.NormalizeStorageKey(storageKey);

		// Якщо BaseUrl задано в конфігурації — використовуємо його
		if (!string.IsNullOrWhiteSpace(_settings.BaseUrl))
		{
			return $"{_settings.BaseUrl.TrimEnd('/')}{_settings.RequestPath}/{normalizedStorageKey}";
		}

		// Інакше динамічно формуємо з HttpContext
		var request = _httpContextAccessor.HttpContext?.Request;
		if (request is not null)
		{
			var baseUrl = $"{request.Scheme}://{request.Host}";
			return $"{baseUrl}{_settings.RequestPath}/{normalizedStorageKey}";
		}

		// Fallback — тільки відносний шлях
		_logger.LogWarning("HttpContext is not available for URL generation, returning relative path");
		return $"{_settings.RequestPath}/{normalizedStorageKey}";
	}

	public Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
	{
		var normalizedStorageKey = StoragePublicUrlBuilder.NormalizeStorageKey(storageKey);
		var fullPath = Path.Combine(_settings.BasePath, normalizedStorageKey.Replace('/', Path.DirectorySeparatorChar));
		Stream stream = File.OpenRead(fullPath);
		return Task.FromResult(stream);
	}

	public Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
	{
		var fullPath = Path.Combine(_settings.BasePath, storageKey.Replace('/', Path.DirectorySeparatorChar));
		if (File.Exists(fullPath))
		{
			File.Delete(fullPath);
			_logger.LogDebug("File deleted from local storage: {StorageKey}", storageKey);
		}
		return Task.CompletedTask;
	}
}
