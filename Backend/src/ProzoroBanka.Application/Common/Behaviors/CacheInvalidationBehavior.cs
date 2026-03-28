using MediatR;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior що автоматично інвалідує кеш за тегами
/// після успішного виконання команди, що реалізує ICacheInvalidatingCommand.
/// </summary>
public sealed class CacheInvalidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
	where TRequest : notnull
{
	private readonly ICacheInvalidationService? _cacheInvalidation;
	private readonly ILogger<CacheInvalidationBehavior<TRequest, TResponse>> _logger;

	public CacheInvalidationBehavior(
		ILogger<CacheInvalidationBehavior<TRequest, TResponse>> logger,
		ICacheInvalidationService? cacheInvalidation = null)
	{
		_logger = logger;
		_cacheInvalidation = cacheInvalidation;
	}

	public async Task<TResponse> Handle(
		TRequest request,
		RequestHandlerDelegate<TResponse> next,
		CancellationToken cancellationToken)
	{
		var response = await next();

		if (request is ICacheInvalidatingCommand invalidatingCommand && _cacheInvalidation is not null)
		{
			var shouldInvalidate = true;

			if (response is ServiceResponse serviceResponse)
			{
				shouldInvalidate = serviceResponse.IsSuccess;
			}
			else if (response is not null)
			{
				var responseType = response.GetType();
				if (responseType.IsGenericType &&
					responseType.GetGenericTypeDefinition() == typeof(ServiceResponse<>))
				{
					var isSuccessProperty = responseType.GetProperty(nameof(ServiceResponse.IsSuccess));
					if (isSuccessProperty is not null)
					{
						shouldInvalidate = (bool)(isSuccessProperty.GetValue(response) ?? false);
					}
				}
			}

			if (shouldInvalidate)
			{
				var tags = invalidatingCommand.CacheTags.ToList();
				if (tags.Count > 0)
				{
					_logger.LogInformation(
						"Invalidating cache tags {Tags} after successful command {CommandType}",
						string.Join(", ", tags),
						typeof(TRequest).Name);

					try
					{
						await _cacheInvalidation.InvalidateByTagsAsync(tags, cancellationToken);
					}
					catch (Exception ex)
					{
						_logger.LogWarning(
							ex,
							"Cache invalidation failed for command {CommandType}; continuing without failing the request",
							typeof(TRequest).Name);
					}
				}
			}
		}

		return response;
	}
}
