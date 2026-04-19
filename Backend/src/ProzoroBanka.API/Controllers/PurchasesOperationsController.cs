using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Purchases.Commands.AddItemToWaybill;
using ProzoroBanka.Application.Purchases.Commands.AttachPurchaseToCampaign;
using ProzoroBanka.Application.Purchases.Commands.CreateDraftPurchase;
using ProzoroBanka.Application.Purchases.DTOs;

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
	[HasPermission(Permissions.PurchasesManage)]
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
	[HasPermission(Permissions.PurchasesManage)]
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
	[HasPermission(Permissions.PurchasesManage)]
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
}
