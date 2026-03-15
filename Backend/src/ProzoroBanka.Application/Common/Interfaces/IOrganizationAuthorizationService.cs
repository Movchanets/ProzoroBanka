using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Сервіс перевірки прав доступу на рівні організації.
/// </summary>
public interface IOrganizationAuthorizationService
{
	/// <summary>Перевіряє, чи є користувач активним учасником організації.</summary>
	Task<bool> IsMember(Guid orgId, Guid userId, CancellationToken ct = default);

	/// <summary>Перевіряє, чи має користувач мінімально необхідну роль (Owner &lt; Admin &lt; Reporter).</summary>
	Task<bool> HasRole(Guid orgId, Guid userId, OrganizationRole minRole, CancellationToken ct = default);

	/// <summary>Перевіряє, чи має користувач конкретний permission flag. Owner завжди true.</summary>
	Task<bool> HasPermission(Guid orgId, Guid userId, OrganizationPermissions permission, CancellationToken ct = default);

	/// <summary>Повертає запис членства або null, якщо не є учасником.</summary>
	Task<OrganizationMember?> GetMembership(Guid orgId, Guid userId, CancellationToken ct = default);
}
