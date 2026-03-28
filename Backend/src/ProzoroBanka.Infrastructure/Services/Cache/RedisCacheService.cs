using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Cache;

/// <summary>
/// Сервіс інвалідації Output Cache за тегами через IOutputCacheStore.
/// </summary>
public sealed class OutputCacheInvalidationService : ICacheInvalidationService
{
	private readonly IOutputCacheStore _cacheStore;
	private readonly ILogger<OutputCacheInvalidationService> _logger;

	public OutputCacheInvalidationService(
		IOutputCacheStore cacheStore,
		ILogger<OutputCacheInvalidationService> logger)
	{
		_cacheStore = cacheStore;
		_logger = logger;
	}

	public async Task InvalidateByTagAsync(string tag, CancellationToken cancellationToken = default)
	{
		try
		{
			_logger.LogInformation("Starting cache invalidation for tag: {Tag}", tag);
			await _cacheStore.EvictByTagAsync(tag, cancellationToken);
			_logger.LogInformation("Cache invalidation completed for tag: {Tag}", tag);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Error invalidating cache for tag: {Tag}", tag);
			throw;
		}
	}

	public async Task InvalidateByTagsAsync(IEnumerable<string> tags, CancellationToken cancellationToken = default)
	{
		foreach (var tag in tags)
		{
			try
			{
				_logger.LogInformation("Starting cache invalidation for tag: {Tag}", tag);
				await _cacheStore.EvictByTagAsync(tag, cancellationToken);
				_logger.LogInformation("Cache invalidation completed for tag: {Tag}", tag);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error invalidating cache for tag: {Tag}", tag);
				throw;
			}
		}
	}
}
