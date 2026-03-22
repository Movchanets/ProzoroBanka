using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.Application.Campaigns.Commands.SetupMonobankWebhook;
using ProzoroBanka.Application.Campaigns.Queries.GetMonobankJars;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// Stateless proxy до Monobank API: отримання банок (jars) та налаштування webhook.
/// Токен використовується тільки в межах запиту і ніколи не зберігається.
/// </summary>
[ApiController]
[Route("api/campaigns/monobank")]
[Authorize]
public class MonobankProxyController : ControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public MonobankProxyController(ISender sender, ICurrentUserService currentUser)
	{
		_sender = sender;
		_currentUser = currentUser;
	}

	/// <summary>Отримати список банок (jars) клієнта Monobank.</summary>
	[HttpPost("jars")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status401Unauthorized)]
	public async Task<IActionResult> GetJars(
		[FromBody] GetMonobankJarsRequest request, CancellationToken ct)
	{
		var result = await _sender.Send(new GetMonobankJarsQuery(request.Token), ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Налаштувати Monobank webhook для збору.</summary>
	[HttpPost("setup-webhook")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> SetupWebhook(
		[FromBody] SetupMonobankWebhookRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new SetupMonobankWebhookCommand(
			domainUserId.Value,
			request.CampaignId,
			request.Token,
			request.SelectedJarAccountId,
			request.WebhookUrl);

		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}
}

public sealed record GetMonobankJarsRequest(string Token);

public sealed record SetupMonobankWebhookRequest(
	Guid CampaignId,
	string Token,
	string SelectedJarAccountId,
	string WebhookUrl);
