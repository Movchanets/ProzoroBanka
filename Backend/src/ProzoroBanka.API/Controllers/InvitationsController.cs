using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Organizations.Commands.AcceptInvitation;
using ProzoroBanka.Application.Organizations.Commands.DeclineInvitation;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.Queries.GetInvitationByToken;
using ProzoroBanka.Application.Organizations.Queries.GetMyInvitations;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// Ендпоінти для прийняття, відхилення та перегляду запрошень (з боку запрошеного).
/// </summary>
[Authorize]
public class InvitationsController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public InvitationsController(ISender sender, ICurrentUserService currentUser)
	{
		_sender = sender;
		_currentUser = currentUser;
	}

	/// <summary>Переглянути вхідні запрошення поточного користувача (email-invites).</summary>
	[HttpGet("my")]
	[ProducesResponseType(typeof(IReadOnlyList<InvitationDto>), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetMy(CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetMyInvitationsQuery(domainUserId.Value), ct);
		return Ok(result.Payload);
	}

	/// <summary>
	/// Отримати публічну інформацію про запрошення за токеном.
	/// Доступно без авторизації — показує назву організації та хто запросив.
	/// </summary>
	[HttpGet("{token}")]
	[AllowAnonymous]
	[ProducesResponseType(typeof(InvitationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetByToken(string token, CancellationToken ct)
	{
		var result = await _sender.Send(new GetInvitationByTokenQuery(token), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Прийняти запрошення за токеном. Стає учасником організації.</summary>
	[HttpPost("{token}/accept")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Accept(string token, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new AcceptInvitationCommand(domainUserId.Value, token), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: BadRequest(new { Error = result.Message });

		return NoContent();
	}

	/// <summary>Відхилити запрошення за токеном.</summary>
	[HttpPost("{token}/decline")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Decline(string token, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new DeclineInvitationCommand(domainUserId.Value, token), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: BadRequest(new { Error = result.Message });

		return NoContent();
	}
}
