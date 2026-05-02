using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Auth;

public sealed class DistributedAuthSessionStore : IAuthSessionStore
{
	private readonly IDistributedCache _cache;
	private readonly ILogger<DistributedAuthSessionStore> _logger;

	public DistributedAuthSessionStore(
		IDistributedCache cache,
		ILogger<DistributedAuthSessionStore> logger)
	{
		_cache = cache;
		_logger = logger;
	}

	public async Task StoreSessionAsync(
		Guid userId,
		string sessionId,
		string refreshTokenHash,
		DateTime refreshTokenExpiryUtc,
		CancellationToken ct = default)
	{
		var payload = JsonSerializer.Serialize(new AuthSessionState(refreshTokenHash, refreshTokenExpiryUtc));
		await _cache.SetStringAsync(
			BuildSessionKey(userId, sessionId),
			payload,
			new DistributedCacheEntryOptions
			{
				AbsoluteExpiration = refreshTokenExpiryUtc
			},
			ct);
	}

	public async Task<AuthSessionState?> GetSessionAsync(Guid userId, string sessionId, CancellationToken ct = default)
	{
		var payload = await _cache.GetStringAsync(BuildSessionKey(userId, sessionId), ct);
		if (string.IsNullOrWhiteSpace(payload))
			return null;

		try
		{
			return JsonSerializer.Deserialize<AuthSessionState>(payload);
		}
		catch (JsonException ex)
		{
			_logger.LogWarning(ex, "Failed to deserialize auth session state for user {UserId}, sid {SessionId}", userId, sessionId);
			return null;
		}
	}

	public async Task<bool> IsSessionActiveAsync(Guid userId, string sessionId, CancellationToken ct = default)
	{
		var session = await GetSessionAsync(userId, sessionId, ct);
		return session is not null && session.RefreshTokenExpiryUtc > DateTime.UtcNow;
	}

	public Task RemoveSessionAsync(Guid userId, string sessionId, CancellationToken ct = default)
	{
		return _cache.RemoveAsync(BuildSessionKey(userId, sessionId), ct);
	}

	private static string BuildSessionKey(Guid userId, string sessionId)
	{
		return $"auth:session:{userId:D}:{sessionId}";
	}
}
