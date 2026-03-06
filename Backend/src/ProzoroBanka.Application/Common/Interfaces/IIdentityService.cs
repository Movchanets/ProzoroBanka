using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Абстракція для Identity-операцій (UserManager/SignInManager/RoleManager).
/// Дозволяє Application layer працювати з Identity без прямої залежності від Infrastructure.
/// </summary>
public interface IUserService
{
	// ── Authentication ──

	/// <summary>
	/// Реєстрація нового користувача (створення Identity + Domain User).
	/// </summary>
	Task<ServiceResponse<AuthResult>> RegisterAsync(
		string email, string password, string firstName, string lastName, CancellationToken ct = default);

	/// <summary>
	/// Автентифікація за email/паролем.
	/// </summary>
	Task<ServiceResponse<AuthResult>> LoginAsync(
		string email, string password, CancellationToken ct = default);

	/// <summary>
	/// Автентифікація через Google IdToken.
	/// </summary>
	Task<ServiceResponse<AuthResult>> GoogleLoginAsync(
		string idToken, CancellationToken ct = default);

	/// <summary>
	/// Оновлення токенів за refresh token.
	/// </summary>
	Task<ServiceResponse<TokenResponse>> RefreshTokenAsync(
		string accessToken, string refreshToken, CancellationToken ct = default);

	/// <summary>
	/// Відкликання refresh token (logout).
	/// </summary>
	Task<ServiceResponse> LogoutAsync(Guid applicationUserId, CancellationToken ct = default);

	/// <summary>
	/// Отримання профілю користувача за Identity UserId.
	/// </summary>
	Task<ServiceResponse<UserProfile>> GetProfileAsync(Guid applicationUserId, CancellationToken ct = default);

	// ── Role Management ──

	/// <summary>
	/// Створення нової ролі.
	/// </summary>
	Task<ServiceResponse> CreateRoleAsync(string roleName, string? description = null, CancellationToken ct = default);

	/// <summary>
	/// Призначення ролей користувачу.
	/// </summary>
	Task<ServiceResponse> AssignRolesAsync(Guid applicationUserId, IEnumerable<string> roles, CancellationToken ct = default);

	// ── User Management ──

	/// <summary>
	/// Блокування/розблокування користувача.
	/// </summary>
	Task<ServiceResponse> SetLockoutAsync(Guid applicationUserId, bool locked, CancellationToken ct = default);

	/// <summary>
	/// Видалення користувача.
	/// </summary>
	Task<ServiceResponse> DeleteUserAsync(Guid applicationUserId, CancellationToken ct = default);

	/// <summary>
	/// Ініціація скидання пароля — генерація та відправка токена.
	/// </summary>
	Task<ServiceResponse> ForgotPasswordAsync(string email, string origin, CancellationToken ct = default);

	/// <summary>
	/// Скидання пароля за токеном.
	/// </summary>
	Task<ServiceResponse> ResetPasswordAsync(string email, string token, string newPassword, CancellationToken ct = default);
}

/// <summary>
/// Результат автентифікації (реєстрація/вхід).
/// </summary>
public record AuthResult(
	string AccessToken,
	string RefreshToken,
	DateTime AccessTokenExpiry,
	Guid DomainUserId,
	string Email,
	string FirstName,
	string LastName,
	string? ProfilePhotoUrl);

/// <summary>
/// Повний профіль користувача.
/// </summary>
public record UserProfile(
	Guid DomainUserId,
	string Email,
	string FirstName,
	string LastName,
	string? ProfilePhotoUrl,
	IList<string> Roles);
