using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Сервіс генерації та валідації JWT/Refresh токенів.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Генерує пару Access + Refresh токенів для користувача.
    /// </summary>
    Task<TokenResponse> GenerateTokensAsync(Guid applicationUserId, string email, IList<string> roles, IList<string> permissions, string? sessionId = null, CancellationToken ct = default);

    /// <summary>
    /// Генерує токени для вже існуючого користувача, збираючи ролі та permissions з БД.
    /// </summary>
    Task<TokenResponse> GenerateTokensForUserAsync(Guid applicationUserId, CancellationToken ct = default);

    /// <summary>
    /// Оновлює токени за допомогою refresh token.
    /// </summary>
    Task<TokenResponse> RefreshTokensAsync(string accessToken, string refreshToken, CancellationToken ct = default);

    /// <summary>
    /// Відкликає refresh token.
    /// </summary>
    Task RevokeSessionAsync(Guid applicationUserId, string sessionId, CancellationToken ct = default);
}
