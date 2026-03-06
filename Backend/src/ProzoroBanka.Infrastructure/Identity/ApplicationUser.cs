using Microsoft.AspNetCore.Identity;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Infrastructure.Identity;

/// <summary>
/// Identity-користувач. Зберігає автентифікаційні дані.
/// Бізнес-дані зберігаються в доменному User через DomainUserId.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
	/// <summary>
	/// Refresh token для JWT аутентифікації.
	/// </summary>
	public string? RefreshToken { get; set; }

	/// <summary>
	/// Час закінчення дії refresh token.
	/// </summary>
	public DateTime? RefreshTokenExpiryTime { get; set; }

	/// <summary>
	/// Зв'язок з чистим доменним User.
	/// </summary>
	public Guid? DomainUserId { get; set; }

	/// <summary>
	/// Навігаційна властивість до доменного User.
	/// </summary>
	public virtual User? DomainUser { get; set; }

	/// <summary>
	/// Навігаційна властивість для Identity ролей.
	/// </summary>
	public ICollection<ApplicationUserRole> UserRoles { get; set; } = new List<ApplicationUserRole>();
}
