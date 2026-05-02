using Microsoft.AspNetCore.Http;

namespace ProzoroBanka.API.Configuration;

public sealed class AuthCookieSettings
{
	public const string SectionName = "AuthCookies";

	public string AccessTokenCookieName { get; init; } = "pb_access_token";
	public string RefreshTokenCookieName { get; init; } = "pb_refresh_token";
	public string CsrfTokenCookieName { get; init; } = "pb_csrf_token";
	public string CsrfHeaderName { get; init; } = "X-CSRF-TOKEN";
	public string SameSite { get; init; } = "Lax";
	public bool Secure { get; init; } = true;
	public string Path { get; init; } = "/";
	public string? Domain { get; init; }
	public int CsrfTokenSizeBytes { get; init; } = 32;
	public bool Enabled { get; init; } = true;

	public SameSiteMode ResolveSameSiteMode()
	{
		return SameSite.Trim().ToLowerInvariant() switch
		{
			"strict" => SameSiteMode.Strict,
			"none" => SameSiteMode.None,
			_ => SameSiteMode.Lax
		};
	}
}
