using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.Commands.AddReceiptItemPhotos;
using ProzoroBanka.Application.Receipts.Commands.ActivateReceipt;
using ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItemPhoto;
using ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;
using ProzoroBanka.Application.Receipts.Commands.ReorderReceiptItemPhotos;
using ProzoroBanka.Application.Receipts.Commands.ReplaceReceiptItemPhoto;
using ProzoroBanka.Application.Receipts.Commands.RetryReceiptProcessing;
using ProzoroBanka.Application.Receipts.Commands.UpdateReceiptDraftFile;
using ProzoroBanka.Application.Receipts.Commands.UpdateReceiptOcrDraft;
using ProzoroBanka.Application.Receipts.Commands.UploadReceiptDraft;
using ProzoroBanka.Application.Receipts.Commands.VerifyReceipt;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Application.Receipts.Queries.GetMyReceipts;
using ProzoroBanka.Application.Receipts.Queries.GetMyReceipt;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

[Authorize]
[Route("api/receipts")]
public class ReceiptsController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public ReceiptsController(ISender sender, ICurrentUserService currentUser)
	{
		_sender = sender;
		_currentUser = currentUser;
	}

	[HttpPost("draft")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.ReceiptsCreate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UploadDraft([FromForm] IFormFile? file, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл чека обов'язковий" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(
			new UploadReceiptDraftCommand(userId.Value, stream, file.FileName, file.ContentType, file.Length),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPut("{id:guid}/draft")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateDraft(Guid id, [FromForm] IFormFile? file, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл чека обов'язковий" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(
			new UpdateReceiptDraftFileCommand(userId.Value, id, stream, file.FileName, file.ContentType),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/extract")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Extract(Guid id, [FromForm] Guid organizationId, [FromForm] IFormFile? file, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Для OCR потрібен файл чека" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(
			new ExtractReceiptDataCommand(userId.Value, id, stream, file.FileName, organizationId),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/verify")]
	[HasPermission(Permissions.ReceiptsVerify)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Verify(Guid id, [FromBody] VerifyReceiptRequest request, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new VerifyReceiptCommand(userId.Value, id, request.OrganizationId), ct);
		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpGet]
	[HasPermission(Permissions.ReceiptsRead)]
	[ProducesResponseType(typeof(IReadOnlyList<ReceiptListItemDto>), StatusCodes.Status200OK)]
	public async Task<IActionResult> List(
		[FromQuery] string? search,
		[FromQuery] ReceiptStatus? status,
		[FromQuery] bool onlyUnattached = false,
		CancellationToken ct = default)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new GetMyReceiptsQuery(userId.Value, search, status, onlyUnattached),
			ct);

		return Ok(result.Payload);
	}

	[HttpPatch("{id:guid}/ocr-draft")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateOcrDraft(Guid id, [FromBody] UpdateReceiptOcrDraftRequest request, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new UpdateReceiptOcrDraftCommand(
			userId.Value,
			id,
			request.Alias,
			request.MerchantName,
			request.TotalAmount,
			request.PurchaseDateUtc,
			request.FiscalNumber,
			request.ReceiptCode,
			request.Currency,
			request.PurchasedItemName,
			request.OcrStructuredPayloadJson), ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/item-photos")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> AddItemPhotos(Guid id, [FromForm] List<IFormFile>? files, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (files is null || files.Count == 0 || files.Any(file => file.Length == 0))
			return BadRequest(new { Error = "Потрібно передати щонайменше одне фото товару" });

		var uploads = new List<ReceiptUploadFile>();
		var streams = new List<Stream>();

		try
		{
			foreach (var file in files)
			{
				var stream = file.OpenReadStream();
				streams.Add(stream);
				uploads.Add(new ReceiptUploadFile(stream, file.FileName, file.ContentType));
			}

			var result = await _sender.Send(new AddReceiptItemPhotosCommand(userId.Value, id, uploads), ct);
			return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
		}
		finally
		{
			foreach (var stream in streams)
				await stream.DisposeAsync();
		}
	}

	[HttpPut("{id:guid}/item-photos/{photoId:guid}")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> ReplaceItemPhoto(Guid id, Guid photoId, [FromForm] IFormFile? file, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл фото товару обов'язковий" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(
			new ReplaceReceiptItemPhotoCommand(
				userId.Value,
				id,
				photoId,
				new ReceiptUploadFile(stream, file.FileName, file.ContentType)),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPut("{id:guid}/item-photos/order")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> ReorderItemPhotos(Guid id, [FromBody] ReorderReceiptItemPhotosRequest request, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new ReorderReceiptItemPhotosCommand(userId.Value, id, request.PhotoIds),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpDelete("{id:guid}/item-photos/{photoId:guid}")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> DeleteItemPhoto(Guid id, Guid photoId, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new DeleteReceiptItemPhotoCommand(userId.Value, id, photoId), ct);
		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/activate")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new ActivateReceiptCommand(userId.Value, id), ct);
		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/retry")]
	[HasPermission(Permissions.ReceiptsUpdate)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new RetryReceiptProcessingCommand(userId.Value, id), ct);
		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpGet("{id:guid}")]
	[HasPermission(Permissions.ReceiptsRead)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetMyReceiptQuery(userId.Value, id), ct);
		return result.IsSuccess ? Ok(result.Payload) : NotFound(new { Error = result.Message });
	}
}
