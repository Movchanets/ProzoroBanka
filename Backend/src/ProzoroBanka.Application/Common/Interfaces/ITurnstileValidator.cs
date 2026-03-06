namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Валідатор Cloudflare Turnstile CAPTCHA токена.
/// </summary>
public interface ITurnstileService
{
	/// <summary>
	/// Перевіряє Turnstile-токен з клієнта.
	/// </summary>
	/// <param name="token">Токен від Turnstile widget.</param>
	/// <param name="remoteIp">IP-адреса клієнта (опціонально).</param>
	/// <param name="ct">Токен відміни.</param>
	/// <returns>true якщо токен валідний.</returns>
	Task<bool> ValidateAsync(string token, string? remoteIp = null, CancellationToken ct = default);
}
