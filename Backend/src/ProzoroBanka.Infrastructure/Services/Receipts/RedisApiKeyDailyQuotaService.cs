using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class RedisApiKeyDailyQuotaService : IApiKeyDailyQuotaService
{
	private readonly IDistributedCache _cache;
	private readonly StateValidatorOptions _options;

	public RedisApiKeyDailyQuotaService(
		IDistributedCache cache,
		IOptions<StateValidatorOptions> options)
	{
		_cache = cache;
		_options = options.Value;
	}

	public async Task<QuotaDecision> TryConsumeAsync(string keyFingerprint, DateTime utcNow, CancellationToken ct)
	{
		if (!_options.Enabled)
			return new QuotaDecision(true, null);

		if (string.IsNullOrWhiteSpace(keyFingerprint))
			return new QuotaDecision(false, "Не вдалося визначити ключ для квоти");

		var dailyLimit = _options.DailyLimitPerToken <= 0 ? 900 : _options.DailyLimitPerToken;

		var kyivNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, ResolveKyivTimeZone());
		var dayKey = kyivNow.ToString("yyyyMMdd");
		var cacheKey = $"state-quota:{keyFingerprint}:{dayKey}";

		var currentRaw = await _cache.GetStringAsync(cacheKey, ct);
		var current = int.TryParse(currentRaw, out var parsed) ? parsed : 0;
		if (current >= dailyLimit)
			return new QuotaDecision(false, $"Досягнуто добовий ліміт {dailyLimit} запитів для API ключа");

		var next = current + 1;
		var nextKyivMidnight = kyivNow.Date.AddDays(1);
		var expiryUtc = TimeZoneInfo.ConvertTimeToUtc(nextKyivMidnight, ResolveKyivTimeZone());

		await _cache.SetStringAsync(
			cacheKey,
			next.ToString(),
			new DistributedCacheEntryOptions
			{
				AbsoluteExpiration = expiryUtc
			},
			ct);

		return new QuotaDecision(true, null);
	}

	private static TimeZoneInfo ResolveKyivTimeZone()
	{
		foreach (var id in new[] { "Europe/Kyiv", "Europe/Kiev", "FLE Standard Time" })
		{
			try
			{
				return TimeZoneInfo.FindSystemTimeZoneById(id);
			}
			catch
			{
				// ignore and try next id
			}
		}

		return TimeZoneInfo.Utc;
	}
}
