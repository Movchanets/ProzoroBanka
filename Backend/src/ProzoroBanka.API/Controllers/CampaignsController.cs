using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.Application.Campaigns.Commands.AttachReceiptToCampaign;
using ProzoroBanka.Application.Campaigns.Commands.ChangeCampaignStatus;
using ProzoroBanka.Application.Campaigns.Commands.CreateCampaign;
using ProzoroBanka.Application.Campaigns.Commands.DetachReceiptFromCampaign;
using ProzoroBanka.Application.Campaigns.Commands.DeleteCampaign;
using ProzoroBanka.Application.Campaigns.Commands.UpdateCampaign;
using ProzoroBanka.Application.Campaigns.Commands.UpdateCampaignBalance;
using ProzoroBanka.Application.Campaigns.Commands.UploadCampaignCover;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Campaigns.Queries.GetCampaignDetails;
using ProzoroBanka.Application.Campaigns.Queries.GetCampaignReceipts;
using ProzoroBanka.Application.Campaigns.Queries.GetCampaignStats;
using ProzoroBanka.Application.Campaigns.Queries.GetCampaignTransactions;
using ProzoroBanka.Application.Campaigns.Queries.GetOrganizationCampaigns;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// CRUD зборів (campaigns) у рамках організацій.
/// </summary>
[Authorize]
public class CampaignsController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public CampaignsController(ISender sender, ICurrentUserService currentUser)
	{
		_sender = sender;
		_currentUser = currentUser;
	}

	// ── Organization-scoped endpoints ──

	/// <summary>Створити новий збір в організації.</summary>
	[HttpPost("/api/organizations/{orgId:guid}/campaigns")]
	[ProducesResponseType(typeof(CampaignDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Create(Guid orgId, [FromBody] CreateCampaignRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new CreateCampaignCommand(
			domainUserId.Value, orgId, request.Title, request.Description,
			request.GoalAmount, request.Deadline, request.SendUrl);

		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Отримати список зборів організації (з опціональним фільтром по статусу).</summary>
	[HttpGet("/api/organizations/{orgId:guid}/campaigns")]
	[ProducesResponseType(typeof(IReadOnlyList<CampaignDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetByOrganization(
		Guid orgId, [FromQuery] CampaignStatus? status, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new GetOrganizationCampaignsQuery(domainUserId.Value, orgId, status), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Отримати статистику зборів організації.</summary>
	[HttpGet("/api/organizations/{orgId:guid}/campaigns/stats")]
	[ProducesResponseType(typeof(CampaignStatsDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetStats(Guid orgId, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new GetCampaignStatsQuery(domainUserId.Value, orgId), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	// ── Campaign-scoped endpoints ──

	/// <summary>Отримати деталі збору.</summary>
	[HttpGet("{id:guid}")]
	[ProducesResponseType(typeof(CampaignDetailDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetDetails(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetCampaignDetailsQuery(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Оновити збір.</summary>
	[HttpPut("{id:guid}")]
	[ProducesResponseType(typeof(CampaignDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Update(
		Guid id, [FromBody] UpdateCampaignRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new UpdateCampaignCommand(
			domainUserId.Value, id, request.Title, request.Description,
			request.GoalAmount, request.Deadline, request.SendUrl);

		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Завантажити обкладинку збору.</summary>
	[HttpPost("{id:guid}/cover")]
	[Consumes("multipart/form-data")]
	[ProducesResponseType(typeof(CampaignDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> UploadCover(Guid id, [FromForm] IFormFile? file, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл обкладинки обов'язковий." });

		await using var fileStream = file.OpenReadStream();
		var command = new UploadCampaignCoverCommand(
			domainUserId.Value, id, fileStream, file.FileName, file.ContentType, file.Length);
		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Змінити статус збору.</summary>
	[HttpPut("{id:guid}/status")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> ChangeStatus(
		Guid id, [FromBody] ChangeCampaignStatusRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new ChangeCampaignStatusCommand(domainUserId.Value, id, request.NewStatus);
		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	/// <summary>Видалити збір (тільки Draft).</summary>
	[HttpDelete("{id:guid}")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new DeleteCampaignCommand(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return NoContent();
	}

	/// <summary>Оновити баланс збору вручну.</summary>
	[HttpPost("{id:guid}/balance/manual")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> UpdateBalance(
		Guid id, [FromBody] UpdateCampaignBalanceRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new UpdateCampaignBalanceCommand(
			domainUserId.Value, id, request.NewCurrentAmount, request.Reason);
		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	/// <summary>Отримати історію транзакцій збору.</summary>
	[HttpGet("{id:guid}/transactions")]
	[ProducesResponseType(typeof(IReadOnlyList<CampaignTransactionDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetTransactions(
		Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new GetCampaignTransactionsQuery(domainUserId.Value, id, page, pageSize), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("{id:guid}/receipts")]
	[ProducesResponseType(typeof(IReadOnlyList<ReceiptListItemDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetReceipts(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetCampaignReceiptsQuery(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpPost("{id:guid}/receipts/{receiptId:guid}")]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> AttachReceipt(Guid id, Guid receiptId, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new AttachReceiptToCampaignCommand(domainUserId.Value, id, receiptId), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Немає доступу")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpDelete("{id:guid}/receipts/{receiptId:guid}")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> DetachReceipt(Guid id, Guid receiptId, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new DetachReceiptFromCampaignCommand(domainUserId.Value, id, receiptId), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Немає доступу")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return NoContent();
	}

	[HttpGet("{id:guid}/photos")]
	[ProducesResponseType(typeof(IReadOnlyList<CampaignPhotoDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetPhotos(Guid id, CancellationToken ct)
	{
		var result = await _sender.Send(new Application.Campaigns.Queries.GetCampaignPhotos.GetCampaignPhotosQuery(id), ct);

		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpPost("{id:guid}/photos")]
	[Consumes("multipart/form-data")]
	[ProducesResponseType(typeof(CampaignPhotoDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> AddPhoto(
		Guid id, 
		[FromForm] IFormFile? file,
		[FromForm] string? description,
		CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл обов'язковий." });

		await using var fileStream = file.OpenReadStream();
		var command = new Application.Campaigns.Commands.AddCampaignPhotos.AddCampaignPhotosCommand(
			domainUserId.Value, id, fileStream, file.FileName, file.ContentType, description);

		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpDelete("{id:guid}/photos/{photoId:guid}")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> DeletePhoto(Guid id, Guid photoId, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new Application.Campaigns.Commands.DeleteCampaignPhoto.DeleteCampaignPhotoCommand(domainUserId.Value, id, photoId), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return NoContent();
	}

	[HttpPut("{id:guid}/photos/reorder")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> ReorderPhotos(Guid id, [FromBody] ReorderCampaignPhotosRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new Application.Campaigns.Commands.ReorderCampaignPhotos.ReorderCampaignPhotosCommand(domainUserId.Value, id, request.PhotoIds), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return NoContent();
	}

	[HttpPut("{id:guid}/photos/{photoId:guid}")]
	[ProducesResponseType(typeof(CampaignPhotoDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> UpdatePhoto(Guid id, Guid photoId, [FromBody] UpdateCampaignPhotoRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new Application.Campaigns.Commands.UpdateCampaignPhoto.UpdateCampaignPhotoCommand(domainUserId.Value, id, photoId, request.Description, request.SetAsCover), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}
}
