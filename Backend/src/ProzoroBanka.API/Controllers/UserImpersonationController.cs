using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Users.Commands.ImpersonateUser;

namespace ProzoroBanka.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize]
public class UserImpersonationController : ApiControllerBase
{
	private readonly ISender _sender;

	public UserImpersonationController(ISender sender)
	{
		_sender = sender;
	}

	[HttpPost("{id:guid}/impersonate")]
	[HasPermission(Permissions.UsersImpersonate)]
	[ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> Impersonate(Guid id, CancellationToken ct)
	{
		var result = await _sender.Send(new ImpersonateUserCommand(id), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}
}