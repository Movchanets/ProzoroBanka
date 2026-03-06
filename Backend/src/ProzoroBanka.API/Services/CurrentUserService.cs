using System.Security.Claims;
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
			return id is not null ? Guid.Parse(id) : null;
		}
	}

	public Guid? DomainUserId
	{
		get
		{
			var id = User?.FindFirstValue("domain_user_id");
			return id is not null ? Guid.Parse(id) : null;
		}
	}

	public string? Email => User?.FindFirstValue(ClaimTypes.Email);

	public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
}
