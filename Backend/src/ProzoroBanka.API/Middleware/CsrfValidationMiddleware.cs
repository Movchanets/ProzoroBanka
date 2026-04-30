using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using ProzoroBanka.API.Configuration;

namespace ProzoroBanka.API.Middleware;

public sealed class CsrfValidationMiddleware
{
	private static readonly HashSet<string> SafeMethods =
	[
		HttpMethods.Get,
		HttpMethods.Head,
		HttpMethods.Options,
		HttpMethods.Trace
	];

	private static readonly HashSet<string> IgnoredPaths =
	[
		"/api/auth/login",
		"/api/auth/register",
		"/api/auth/google",
		"/api/auth/forgot-password",
		"/api/auth/reset-password"
	];

	private readonly RequestDelegate _next;
	private readonly AuthCookieSettings _settings;
	private readonly ILogger<CsrfValidationMiddleware> _logger;

	public CsrfValidationMiddleware(
		RequestDelegate next,
		IOptions<AuthCookieSettings> settings,
		ILogger<CsrfValidationMiddleware> logger)
	{
		_next = next;
		_settings = settings.Value;
		_logger = logger;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		if (ShouldSkipValidation(context.Request))
		{
			await _next(context);
			return;
		}

		if (!context.Request.Cookies.TryGetValue(_settings.CsrfTokenCookieName, out var csrfCookie)
			|| string.IsNullOrWhiteSpace(csrfCookie)
			|| !context.Request.Headers.TryGetValue(_settings.CsrfHeaderName, out var csrfHeader)
			|| string.IsNullOrWhiteSpace(csrfHeader))
		{
			_logger.LogWarning("CSRF validation failed (missing token) for {Path}", context.Request.Path);
			await WriteFailureAsync(context);
			return;
		}

		if (!TokensMatch(csrfCookie, csrfHeader!))
		{
			_logger.LogWarning("CSRF validation failed (mismatch) for {Path}", context.Request.Path);
			await WriteFailureAsync(context);
			return;
		}

		await _next(context);
	}

	private bool ShouldSkipValidation(HttpRequest request)
	{
		if (SafeMethods.Contains(request.Method))
			return true;

		if (!request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
			return true;

		if (IgnoredPaths.Contains(request.Path.Value ?? string.Empty))
			return true;

		if (request.Headers.Authorization.Any(value =>
			value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)))
			return true;

		var hasAuthCookies = request.Cookies.ContainsKey(_settings.AccessTokenCookieName)
			|| request.Cookies.ContainsKey(_settings.RefreshTokenCookieName);

		return !hasAuthCookies;
	}

	private static bool TokensMatch(string cookieToken, string headerToken)
	{
		var cookieBytes = Encoding.UTF8.GetBytes(cookieToken);
		var headerBytes = Encoding.UTF8.GetBytes(headerToken);
		return cookieBytes.Length == headerBytes.Length
			&& CryptographicOperations.FixedTimeEquals(cookieBytes, headerBytes);
	}

	private static Task WriteFailureAsync(HttpContext context)
	{
		context.Response.StatusCode = StatusCodes.Status403Forbidden;
		return context.Response.WriteAsJsonAsync(new { Error = "CSRF validation failed." });
	}
}
