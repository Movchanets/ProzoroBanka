using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.Commands.ActivateReceipt;
using ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;
using ProzoroBanka.Application.Receipts.Commands.RetryReceiptProcessing;
using ProzoroBanka.Application.Receipts.Commands.UploadReceiptDraft;
using ProzoroBanka.Application.Receipts.Commands.VerifyReceipt;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Application.Receipts.Queries.GetMyReceipt;

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
