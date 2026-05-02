namespace ProzoroBanka.Application.Common.Interfaces;

public interface IAuthSessionStore
{
	Task StoreSessionAsync(Guid userId, string sessionId, string refreshTokenHash, DateTime refreshTokenExpiryUtc, CancellationToken ct = default);
	Task<AuthSessionState?> GetSessionAsync(Guid userId, string sessionId, CancellationToken ct = default);
	Task<bool> IsSessionActiveAsync(Guid userId, string sessionId, CancellationToken ct = default);
	Task RemoveSessionAsync(Guid userId, string sessionId, CancellationToken ct = default);
}

public sealed record AuthSessionState(string RefreshTokenHash, DateTime RefreshTokenExpiryUtc);
