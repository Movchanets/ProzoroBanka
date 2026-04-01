using System.Security.Claims;
using ProzoroBanka.Infrastructure.Identity;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.API.Services;

/// <summary>
/// Реалізація ICurrentUserService — читає дані з HttpContext.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
	private readonly IHttpContextAccessor _httpContextAccessor;

	public CurrentUserService(IHttpContextAccessor httpContextAccessor)
	{
		_httpContextAccessor = httpContextAccessor;
	}

	private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

	public Guid? UserId
	{
		get
		{
			var id = User?.FindFirstValue(ClaimTypes.NameIdentifier);
			return Guid.TryParse(id, out var parsedId) ? parsedId : null;
		}
	}

	public Guid? DomainUserId
	{
		get
		{
			var id = User?.FindFirstValue("domain_user_id");
			return Guid.TryParse(id, out var parsedId) ? parsedId : null;
		}
	}

	public string? Email => User?.FindFirstValue(ClaimTypes.Email);

	public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

	public bool IsAdmin
	{
		get { return User?.IsInRole(ApplicationRoles.Admin) ?? false; }
	}
}
