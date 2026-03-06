using Microsoft.AspNetCore.Identity;

namespace ProzoroBanka.Infrastructure.Identity;

/// <summary>
/// Роль Identity (для permission-based авторизації).
/// </summary>
public class RoleEntity : IdentityRole<Guid>
{
	public string? Description { get; set; }

	public ICollection<ApplicationUserRole> UserRoles { get; set; } = new List<ApplicationUserRole>();
	public ICollection<ApplicationRoleClaim> RoleClaims { get; set; } = new List<ApplicationRoleClaim>();
}

/// <summary>
/// Зв'язок M:N між User та Role.
/// </summary>
public class ApplicationUserRole : IdentityUserRole<Guid>
{
	public virtual ApplicationUser User { get; set; } = null!;
	public virtual RoleEntity Role { get; set; } = null!;
}

/// <summary>
/// Claim ролі (зберігає permissions).
/// </summary>
public class ApplicationRoleClaim : IdentityRoleClaim<Guid>
{
	public virtual RoleEntity Role { get; set; } = null!;
}
