using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using ProzoroBanka.API.Configuration;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.API.Security;

public sealed class AuthCookieManager : IAuthCookieManager
{
    private readonly AuthCookieSettings _settings;

    public AuthCookieManager(IOptions<AuthCookieSettings> settings)
    {
        _settings = settings.Value;
    }

    public void SetAuthCookies(HttpResponse response, TokenResponse tokens)
    {
        response.Cookies.Append(_settings.AccessTokenCookieName, tokens.AccessToken, CreateCookieOptions(true, tokens.RefreshTokenExpiry));
        response.Cookies.Append(_settings.RefreshTokenCookieName, tokens.RefreshToken, CreateCookieOptions(true, tokens.RefreshTokenExpiry));
        SetCsrfCookie(response, tokens.RefreshTokenExpiry);
    }

    public void ClearAuthCookies(HttpResponse response)
    {
        var options = CreateCookieOptions(true, DateTime.UnixEpoch);
        response.Cookies.Delete(_settings.AccessTokenCookieName, options);
        response.Cookies.Delete(_settings.RefreshTokenCookieName, options);
        response.Cookies.Delete(_settings.CsrfTokenCookieName, CreateCookieOptions(false, DateTime.UnixEpoch));
    }

    public string SetCsrfCookie(HttpResponse response, DateTime? expiresAtUtc = null)
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(Math.Max(_settings.CsrfTokenSizeBytes, 16));
        var csrfToken = WebEncoders.Base64UrlEncode(tokenBytes);
        response.Cookies.Append(_settings.CsrfTokenCookieName, csrfToken, CreateCookieOptions(false, expiresAtUtc));
        return csrfToken;
    }

    private CookieOptions CreateCookieOptions(bool httpOnly, DateTime? expiresAtUtc)
    {
        var sameSite = _settings.ResolveSameSiteMode();
        return new CookieOptions
        {
            HttpOnly = httpOnly,
            Secure = _settings.Secure,
            SameSite = sameSite,
            Expires = expiresAtUtc,
            Path = _settings.Path,
            IsEssential = true
        };
    }
}
