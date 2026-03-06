namespace ProzoroBanka.Application.Common.Models;

/// <summary>
/// Відповідь з парою токенів (Access + Refresh).
/// </summary>
public record TokenResponse(
	string AccessToken,
	string RefreshToken,
	DateTime AccessTokenExpiry,
	DateTime RefreshTokenExpiry
);
