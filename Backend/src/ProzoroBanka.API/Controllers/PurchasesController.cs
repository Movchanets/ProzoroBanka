using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Purchases.Commands.CreatePurchase;
using ProzoroBanka.Application.Purchases.Commands.DeleteDocument;
using ProzoroBanka.Application.Purchases.Commands.DeletePurchase;
using ProzoroBanka.Application.Purchases.Commands.UpdateDocumentMetadata;
using ProzoroBanka.Application.Purchases.Commands.UpdatePurchase;
using ProzoroBanka.Application.Purchases.Commands.UploadDocument;
using ProzoroBanka.Application.Purchases.Commands.ProcessDocumentOcr;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Application.Purchases.Queries.GetCampaignPurchases;
using ProzoroBanka.Application.Purchases.Queries.GetPurchaseDetail;
using ProzoroBanka.Application.Purchases.Queries.GetPublicCampaignPurchases;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

[Authorize]
[Route("api/organizations/{organizationId:guid}/campaigns/{campaignId:guid}/purchases")]
public class PurchasesController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public PurchasesController(ISender sender, ICurrentUserService currentUser)
	{
		_sender = sender;
		_currentUser = currentUser;
	}

	[HttpGet]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(IReadOnlyList<PurchaseListItemDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> List(
		Guid organizationId,
		Guid campaignId,
		[FromQuery] PurchaseStatus? status,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new GetCampaignPurchasesQuery(userId.Value, organizationId, campaignId, status), ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpGet("{purchaseId:guid}")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetById(
		Guid organizationId,
		Guid campaignId,
		Guid purchaseId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new GetPurchaseDetailQuery(userId.Value, organizationId, campaignId, purchaseId), ct);

		return result.IsSuccess ? Ok(result.Payload) : NotFound(new { Error = result.Message });
	}

	[HttpPost]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Create(
		Guid organizationId,
		Guid campaignId,
		[FromBody] CreatePurchaseRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new CreatePurchaseCommand(
				userId.Value, organizationId, campaignId,
				request.Title, request.TotalAmount),
			ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return CreatedAtAction(
			nameof(GetById),
			new { organizationId, campaignId, purchaseId = result.Payload!.Id },
			result.Payload);
	}

	[HttpPatch("{purchaseId:guid}")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(typeof(PurchaseDetailDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Update(
		Guid organizationId,
		Guid campaignId,
		Guid purchaseId,
		[FromBody] UpdatePurchaseRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new UpdatePurchaseCommand(
				userId.Value, organizationId, campaignId, purchaseId,
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
		Guid campaignId,
		Guid purchaseId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new DeletePurchaseCommand(userId.Value, organizationId, campaignId, purchaseId), ct);

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
		Guid campaignId,
		Guid purchaseId,
		[FromForm] IFormFile? file,
		[FromForm] DocumentType type,
		[FromForm] DateTime? documentDate,
		[FromForm] long? amount,
		[FromForm] string? counterpartyName,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();
		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл документа обов'язковий" });

		await using var stream = file.OpenReadStream();
		var result = await _sender.Send(
			new UploadDocumentCommand(
				userId.Value, organizationId, campaignId, purchaseId,
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
		Guid campaignId,
		Guid purchaseId,
		Guid documentId,
		[FromBody] UpdateDocumentMetadataRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new UpdateDocumentMetadataCommand(
				userId.Value, organizationId, campaignId, purchaseId, documentId,
				request.Amount, request.CounterpartyName, request.DocumentDate),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpDelete("{purchaseId:guid}/documents/{documentId:guid}")]
	[HasPermission(Permissions.PurchasesManage)]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> DeleteDocument(
		Guid organizationId,
		Guid campaignId,
		Guid purchaseId,
		Guid documentId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new DeleteDocumentCommand(userId.Value, organizationId, campaignId, purchaseId, documentId), ct);

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
		Guid campaignId,
		Guid purchaseId,
		Guid documentId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new ProcessPurchaseDocumentOcrCommand(organizationId, campaignId, purchaseId, documentId, userId.Value), ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}


	// ── Public (donors) ──

	[AllowAnonymous]
	[HttpGet("/api/public/campaigns/{campaignId:guid}/purchases")]
	[ProducesResponseType(typeof(IReadOnlyList<PurchaseDetailDto>), StatusCodes.Status200OK)]
	public async Task<IActionResult> PublicList(Guid campaignId, CancellationToken ct)
	{
		var result = await _sender.Send(new GetPublicCampaignPurchasesQuery(campaignId), ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}
}
