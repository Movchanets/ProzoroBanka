namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Сервіс для отримання даних поточного авторизованого користувача з HttpContext.
/// </summary>
public interface ICurrentUserService
{
	/// <summary>
	/// ID Identity-користувача (ApplicationUser.Id).
	/// </summary>
	Guid? UserId { get; }

	/// <summary>
	/// ID доменного користувача (DomainUser.Id).
	/// </summary>
	Guid? DomainUserId { get; }

	/// <summary>
	/// Email поточного користувача.
	/// </summary>
	string? Email { get; }

	/// <summary>
	/// Чи авторизований користувач.
	/// </summary>
	bool IsAuthenticated { get; }

	/// <summary>
	/// Чи має користувач роль системного адміністратора.
	/// </summary>
	bool IsAdmin { get; }
}
