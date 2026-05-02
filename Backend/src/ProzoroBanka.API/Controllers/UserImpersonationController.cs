using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.API.Security;
using ProzoroBanka.Application.Users.Commands.ImpersonateUser;

namespace ProzoroBanka.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize]
public class UserImpersonationController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly IAuthCookieManager _authCookieManager;

	public UserImpersonationController(ISender sender, IAuthCookieManager authCookieManager)
	{
		_sender = sender;
		_authCookieManager = authCookieManager;
	}

	[HttpPost("{id:guid}/impersonate")]
	[HasPermission(Permissions.UsersImpersonate)]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Impersonate(Guid id, CancellationToken ct)
	{
		var result = await _sender.Send(new ImpersonateUserCommand(id), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		_authCookieManager.SetAuthCookies(Response, result.Payload!);
		return NoContent();
	}
}
