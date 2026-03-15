namespace ProzoroBanka.Application.Auth.DTOs;

/// <summary>
/// Запит на реєстрацію нового користувача.
/// </summary>
public record RegisterRequest(
	string Email,
	string Password,
	string ConfirmPassword,
	string FirstName,
	string LastName,
	string TurnstileToken
);

/// <summary>
/// Запит на вхід.
/// </summary>
public record LoginRequest(
	string Email,
	string Password,
	string TurnstileToken
);

/// <summary>
/// Запит на ініціацію скидання пароля.
/// </summary>
public record ForgotPasswordRequest(
	string Email,
	string TurnstileToken
);

/// <summary>
/// Запит на підтвердження скидання пароля.
/// </summary>
public record ResetPasswordRequest(
	string Email,
	string Token,
	string NewPassword,
	string ConfirmPassword
);

/// <summary>
/// Запит на оновлення токенів.
/// </summary>
public record RefreshTokenRequest(
	string AccessToken,
	string RefreshToken
);

/// <summary>
/// Запит на вхід через Google OAuth.
/// </summary>
public record GoogleLoginRequest(
	string IdToken,
	string TurnstileToken
);

/// <summary>
/// Відповідь на авторизацію.
/// </summary>
public record AuthResponse(
	string AccessToken,
	string RefreshToken,
	DateTime AccessTokenExpiry,
	UserInfoDto User
);

/// <summary>
/// Мінімальна інформація про користувача для відповіді.
/// </summary>
public record UserInfoDto(
	Guid Id,
	string Email,
	string FirstName,
	string LastName,
	string? ProfilePhotoUrl
);

/// <summary>
/// Запит на оновлення профілю поточного користувача.
/// </summary>
public record UpdateProfileRequest(
	string FirstName,
	string LastName,
	string? PhoneNumber
);

/// <summary>
/// Повний профіль користувача для сторінки кабінету.
/// </summary>
public record UserProfileDto(
	Guid Id,
	string Email,
	string FirstName,
	string LastName,
	string? PhoneNumber,
	string? ProfilePhotoUrl,
	IList<string> Roles
);
