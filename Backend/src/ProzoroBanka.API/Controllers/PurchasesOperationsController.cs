using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Purchases.Commands.AddItemToWaybill;
using ProzoroBanka.Application.Purchases.Commands.AttachPurchaseToCampaign;
using ProzoroBanka.Application.Purchases.Commands.DeleteWaybillItem;
using ProzoroBanka.Application.Purchases.Commands.CreateDraftPurchase;
using ProzoroBanka.Application.Purchases.Commands.UpdateWaybillItem;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

[Authorize]
[Route("api/purchases")]
public class PurchasesOperationsController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public PurchasesOperationsController(ISender sender, ICurrentUserService currentUser)
	{
		_sender = sender;
		_currentUser = currentUser;
	}

	[HttpPost("draft")]
	[HasOrganizationPermission(OrganizationPermissions.ManagePurchases, "body.organizationId")]
	[ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> CreateDraft([FromBody] CreateDraftPurchaseRequest request, CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new CreateDraftPurchaseCommand(userId.Value, request.OrganizationId, request.Title, request.Description),
			ct);

		return result.IsSuccess
			? Created($"/api/organizations/{request.OrganizationId}/purchases/{result.Payload}", new { id = result.Payload })
			: BadRequest(new { Error = result.Message });
	}

	[HttpPost("{purchaseId:guid}/attach")]
	[HasOrganizationPermission(OrganizationPermissions.ManagePurchases, "purchaseId")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> AttachToCampaign(
		Guid purchaseId,
		[FromBody] AttachPurchaseToCampaignRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new AttachPurchaseToCampaignCommand(userId.Value, purchaseId, request.CampaignId),
			ct);

		return result.IsSuccess
			? Ok(new { Message = result.Message })
			: BadRequest(new { Error = result.Message });
	}

	[HttpPost("documents/{documentId:guid}/items")]
	[HasOrganizationPermission(OrganizationPermissions.ManagePurchases, "documentId")]
	[ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> AddWaybillItem(
		Guid documentId,
		[FromBody] AddItemToWaybillRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new AddItemToWaybillCommand(userId.Value, documentId, request.Name, request.Quantity, request.UnitPrice),
			ct);

		return result.IsSuccess
			? Created($"/api/purchases/documents/{documentId}/items/{result.Payload}", new { id = result.Payload })
			: BadRequest(new { Error = result.Message });
	}

	[HttpPatch("documents/{documentId:guid}/items/{itemId:guid}")]
	[HasOrganizationPermission(OrganizationPermissions.ManagePurchases, "documentId")]
	[ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateWaybillItem(
		Guid documentId,
		Guid itemId,
		[FromBody] UpdateWaybillItemRequest request,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new UpdateWaybillItemCommand(userId.Value, documentId, itemId, request.Name, request.Quantity, request.UnitPrice),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}

	[HttpDelete("documents/{documentId:guid}/items/{itemId:guid}")]
	[HasOrganizationPermission(OrganizationPermissions.ManagePurchases, "documentId")]
	[ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> DeleteWaybillItem(
		Guid documentId,
		Guid itemId,
		CancellationToken ct)
	{
		var userId = _currentUser.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new DeleteWaybillItemCommand(userId.Value, documentId, itemId),
			ct);

		return result.IsSuccess ? Ok(result.Payload) : BadRequest(new { Error = result.Message });
	}
}
