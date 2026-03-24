using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.Application.Campaigns.Commands.ProcessMonobankWebhook;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// Endpoint для прийому webhook-подій від Monobank.
/// GET — верифікація URL (Monobank перевіряє наявність і HTTP 200).
/// POST — обробка подій транзакцій.
/// </summary>
[ApiController]
[Route("api/webhooks/monobank")]
public class MonobankWebhookController : ControllerBase
{
	private readonly ISender _sender;

	public MonobankWebhookController(ISender sender)
	{
		_sender = sender;
	}

	/// <summary>
	/// Верифікація webhook URL (Monobank надсилає GET для перевірки).
	/// Має повернути строго HTTP 200.
	/// </summary>
	[HttpGet]
	[AllowAnonymous]
	public IActionResult Verify()
	{
		return Ok(new { status = "ok" });
	}

	/// <summary>
	/// Прийом webhook-подій транзакцій від Monobank.
	/// </summary>
	[HttpPost]
	[AllowAnonymous]
	public async Task<IActionResult> Receive(
		[FromBody] MonobankWebhookPayload payload, CancellationToken ct)
	{
		var result = await _sender.Send(new ProcessMonobankWebhookCommand(payload), ct);

		// Always return 200 to Monobank to prevent retries
		// (even if internal processing had issues with unknown accounts)
		return Ok(new { status = result.IsSuccess ? "ok" : "ignored", message = result.Message });
	}
}
