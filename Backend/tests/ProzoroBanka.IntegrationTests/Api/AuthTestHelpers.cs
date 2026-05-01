namespace ProzoroBanka.IntegrationTests.Api;

internal static class AuthTestHelpers
{
	public const string AccessTokenCookieName = "pb_access_token";
	public const string CsrfCookieName = "pb_csrf_token";
	public const string CsrfHeaderName = "X-CSRF-TOKEN";

	public static string? ExtractCookieValue(HttpResponseMessage response, string cookieName)
	{
		if (!response.Headers.TryGetValues("Set-Cookie", out var values))
			return null;

		var prefix = cookieName + "=";
		foreach (var header in values)
		{
			if (!header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
				continue;

			var rawValue = header.Split(';', 2)[0][prefix.Length..];
			return Uri.UnescapeDataString(rawValue);
		}

		return null;
	}


	public static void ApplyCsrfHeader(HttpClient client, HttpResponseMessage response)
	{
		var csrfToken = ExtractCookieValue(response, CsrfCookieName);
		if (string.IsNullOrWhiteSpace(csrfToken))
			return;

		client.DefaultRequestHeaders.Remove(CsrfHeaderName);
		client.DefaultRequestHeaders.TryAddWithoutValidation(CsrfHeaderName, csrfToken);
	}
}
