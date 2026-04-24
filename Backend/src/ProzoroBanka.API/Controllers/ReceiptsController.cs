using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.Commands.AddReceiptItemPhotos;
using ProzoroBanka.Application.Receipts.Commands.ActivateReceipt;
using ProzoroBanka.Application.Receipts.Commands.AddReceiptItem;
using ProzoroBanka.Application.Receipts.Commands.DeleteReceipt;
using ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItem;
using ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItemPhoto;
using ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;
using ProzoroBanka.Application.Receipts.Commands.ImportReceiptTaxXml;
using ProzoroBanka.Application.Receipts.Commands.LinkReceiptItemPhoto;
using ProzoroBanka.Application.Receipts.Commands.ReorderReceiptItemPhotos;
using ProzoroBanka.Application.Receipts.Commands.ReplaceReceiptItemPhoto;
using ProzoroBanka.Application.Receipts.Commands.RetryReceiptProcessing;
using ProzoroBanka.Application.Receipts.Commands.UpdateReceiptItem;
using ProzoroBanka.Application.Receipts.Commands.UpdateReceiptDraftFile;
using ProzoroBanka.Application.Receipts.Commands.UpdateReceiptOcrDraft;
using ProzoroBanka.Application.Receipts.Commands.UploadReceiptDraft;
using ProzoroBanka.Application.Receipts.Commands.UploadOrganizationReceiptDraft;
using ProzoroBanka.Application.Receipts.Commands.VerifyReceipt;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Application.Receipts.Queries.GetOrganizationReceipt;
using ProzoroBanka.Application.Receipts.Queries.GetOrganizationReceipts;
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
	[HasPermission(Permissions.UsersSelf)]
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

	[HttpPost("/api/organizations/{organizationId:guid}/receipts/draft")]
	[Consumes("multipart/form-data")]
	[HasOrganizationPermission(OrganizationPermissions.ManageReceipts)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UploadOrganizationDraft(Guid organizationId, [FromForm] IFormFile? file, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл чека обов'язковий" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(
			new UploadOrganizationReceiptDraftCommand(userId.Value, organizationId, stream, file.FileName, file.ContentType, file.Length),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPut("{id:guid}/draft")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Extract(Guid id, [FromForm] Guid organizationId, [FromForm] IFormFile? file, [FromForm] string? modelIdentifier = null, CancellationToken ct = default)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		await using var stream = file?.OpenReadStream();
		var result = await _sender.Send(
			new ExtractReceiptDataCommand(userId.Value, id, stream, file?.FileName, organizationId, modelIdentifier),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/verify")]
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
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

	[HttpGet("/api/organizations/{organizationId:guid}/receipts")]
	[HasOrganizationPermission(OrganizationPermissions.ManageReceipts)]
	[ProducesResponseType(typeof(IReadOnlyList<ReceiptListItemDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> ListByOrganization(
		Guid organizationId,
		[FromQuery] string? search,
		[FromQuery] ReceiptStatus? status,
		[FromQuery] bool onlyUnattached = false,
		CancellationToken ct = default)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new GetOrganizationReceiptsQuery(userId.Value, organizationId, search, status, onlyUnattached),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPatch("{id:guid}/ocr-draft")]
	[HasPermission(Permissions.UsersSelf)]
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

	[HttpPost("{id:guid}/import-tax-xml")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> ImportTaxXml(Guid id, [FromForm] IFormFile? file, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "XML-файл чека обов'язковий" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(new ImportReceiptTaxXmlCommand(userId.Value, id, stream), ct);
		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/items")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> AddItem(Guid id, [FromBody] AddReceiptItemRequest request, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new AddReceiptItemCommand(
			userId.Value,
			id,
			request.Name,
			request.Quantity,
			request.UnitPrice,
			request.TotalPrice,
			request.Barcode,
			request.VatRate,
			request.VatAmount,
			request.PhotoIds), ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPut("{id:guid}/items/{itemId:guid}")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateItem(Guid id, Guid itemId, [FromBody] UpdateReceiptItemRequest request, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new UpdateReceiptItemCommand(
			userId.Value,
			id,
			itemId,
			request.Name,
			request.Quantity,
			request.UnitPrice,
			request.TotalPrice,
			request.Barcode,
			request.VatRate,
			request.VatAmount), ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpDelete("{id:guid}/items/{itemId:guid}")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> DeleteItem(Guid id, Guid itemId, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new DeleteReceiptItemCommand(userId.Value, id, itemId), ct);
		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpDelete("{id:guid}")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new DeleteReceiptCommand(userId.Value, id), ct);
		return result.IsSuccess ? Ok(new { Message = result.Message }) : BadRequest(new { Error = result.Message });
	}

	[HttpPut("{id:guid}/item-photos/{photoId:guid}/link")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> LinkItemPhoto(Guid id, Guid photoId, [FromBody] LinkReceiptItemPhotoRequest request, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new LinkReceiptItemPhotoCommand(userId.Value, id, photoId, request.ReceiptItemId), ct);
		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpPost("{id:guid}/item-photos")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
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
	[HasPermission(Permissions.UsersSelf)]
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

	[HttpGet("/api/organizations/{organizationId:guid}/receipts/{id:guid}")]
	[HasOrganizationPermission(OrganizationPermissions.ManageReceipts)]
	[ProducesResponseType(typeof(ReceiptPipelineDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> GetByIdInOrganization(Guid organizationId, Guid id, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetOrganizationReceiptQuery(userId.Value, organizationId, id), ct);
		if (result.IsSuccess)
			return Ok(result.Payload);

		if (string.Equals(result.Message, "Чек не знайдено", StringComparison.Ordinal))
			return NotFound(new { Error = result.Message });

		return BadRequest(new { Error = result.Message });
	}
}
