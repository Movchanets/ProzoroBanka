using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Purchases.Commands.DeleteDocument;
using ProzoroBanka.Application.Purchases.Commands.DeletePurchase;
using ProzoroBanka.Application.Purchases.Commands.ProcessDocumentOcr;
using ProzoroBanka.Application.Purchases.Commands.UpdateDocumentMetadata;
using ProzoroBanka.Application.Purchases.Commands.UpdatePurchase;
using ProzoroBanka.Application.Purchases.Commands.UploadDocument;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Application.Purchases.Queries.GetPurchaseDetail;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// Short routes for purchase detail operations that don't require campaignId in the URL.
/// CampaignId is resolved from the purchase entity.
/// </summary>
[Authorize]
[Route("api/organizations/{organizationId:guid}/purchases")]
public class OrganizationPurchaseShortController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;
	private readonly IApplicationDbContext _db;

	public OrganizationPurchaseShortController(
		ISender sender,
		ICurrentUserService currentUser,
		IApplicationDbContext db)
	{
		_sender = sender;
		_currentUser = currentUser;
		_db = db;
	}

	[HttpGet("{purchaseId:guid}")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetById(
		Guid organizationId,
		Guid purchaseId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null) return Unauthorized();

		var result = await _sender.Send(
			new GetPurchaseDetailQuery(userId.Value, organizationId, null, purchaseId), ct);

		return result.IsSuccess ? Ok(result.Payload) : NotFound(new { Error = result.Message });
	}

	[HttpPatch("{purchaseId:guid}")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Update(
		Guid organizationId,
		Guid purchaseId,
		[FromBody] UpdatePurchaseRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null) return Unauthorized();

		var result = await _sender.Send(
			new UpdatePurchaseCommand(
				userId.Value, organizationId, null, purchaseId,
				request.Title, request.TotalAmount, request.Status),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpDelete("{purchaseId:guid}")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Delete(
		Guid organizationId,
		Guid purchaseId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null) return Unauthorized();

		var result = await _sender.Send(
			new DeletePurchaseCommand(userId.Value, organizationId, null, purchaseId), ct);

		return result.IsSuccess
			? Ok(new { Message = result.Message })
			: BadRequest(new { Error = result.Message });
	}

	// ── Documents ──

	[HttpPost("{purchaseId:guid}/documents")]
	[Consumes("multipart/form-data")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(DocumentDto), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UploadDocument(
		Guid organizationId,
		Guid purchaseId,
		[FromForm] IFormFile? file,
		[FromForm] DocumentType type,
		[FromForm] DateTime? documentDate,
		[FromForm] long? amount,
		[FromForm] string? counterpartyName,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null) return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл документа обов'язковий" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(
			new UploadDocumentCommand(
				userId.Value, organizationId, null, purchaseId,
				stream, file.FileName, file.ContentType,
				type, documentDate, amount, counterpartyName),
			ct);

		return result.IsSuccess
			? StatusCode(StatusCodes.Status201Created, result.Payload)
			: BadRequest(new { Error = result.Message });
	}

	[HttpPatch("{purchaseId:guid}/documents/{documentId:guid}/metadata")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateDocumentMetadata(
		Guid organizationId,
		Guid purchaseId,
		Guid documentId,
		[FromBody] UpdateDocumentMetadataRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null) return Unauthorized();

		var result = await _sender.Send(
			new UpdateDocumentMetadataCommand(
				userId.Value, organizationId, null, purchaseId, documentId,
				request.Amount, request.CounterpartyName, request.DocumentDate,
				request.Edrpou, request.PayerFullName,
				request.ReceiptCode, request.PaymentPurpose, request.SenderIban, request.ReceiverIban),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpDelete("{purchaseId:guid}/documents/{documentId:guid}")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> DeleteDocument(
		Guid organizationId,
		Guid purchaseId,
		Guid documentId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null) return Unauthorized();

		var result = await _sender.Send(
			new DeleteDocumentCommand(userId.Value, organizationId, null, purchaseId, documentId), ct);

		return result.IsSuccess
			? Ok(new { Message = result.Message })
			: BadRequest(new { Error = result.Message });
	}

	[HttpPost("{purchaseId:guid}/documents/{documentId:guid}/ocr")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> ProcessOcr(
		Guid organizationId,
		Guid purchaseId,
		Guid documentId,
		[FromBody] ProcessDocumentOcrRequest? request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null) return Unauthorized();

		var result = await _sender.Send(
			new ProcessPurchaseDocumentOcrCommand(
				organizationId,
				null,
				purchaseId,
				documentId,
				userId.Value,
				request?.ConfirmReprocess ?? false),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}
}
