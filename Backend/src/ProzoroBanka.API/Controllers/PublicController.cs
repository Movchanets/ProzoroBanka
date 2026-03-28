using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Application.Public.Queries.GetOrganizationTransparency;
using ProzoroBanka.Application.Public.Queries.GetPublicCampaign;
using ProzoroBanka.Application.Public.Queries.GetPublicCampaignReceipts;
using ProzoroBanka.Application.Public.Queries.GetPublicOrganization;
using ProzoroBanka.Application.Public.Queries.GetPublicOrganizationCampaigns;
using ProzoroBanka.Application.Public.Queries.GetPublicReceipt;
using ProzoroBanka.Application.Public.Queries.SearchOrganizations;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

[AllowAnonymous]
public class PublicController : ApiControllerBase
{
	private readonly ISender _sender;

	public PublicController(ISender sender)
	{
		_sender = sender;
	}

	[HttpGet("/api/public/organizations")]
	[OutputCache(PolicyName = "PublicOrganizations")]
	[ProducesResponseType(typeof(PublicListResponse<PublicOrganizationDto>), StatusCodes.Status200OK)]
	public async Task<IActionResult> SearchOrganizations(
		[FromQuery] string? query,
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 12,
		[FromQuery] bool verifiedOnly = false,
		[FromQuery] bool activeOnly = false,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(
			new SearchOrganizationsQuery(query, page, pageSize, verifiedOnly, activeOnly), ct);

		return Ok(result.Payload);
	}

	[HttpGet("/api/public/organizations/{slug}")]
	[OutputCache(PolicyName = "PublicOrganizationBySlug")]
	[ProducesResponseType(typeof(PublicOrganizationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetOrganization(string slug, CancellationToken ct)
	{
		var result = await _sender.Send(new GetPublicOrganizationQuery(slug), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("/api/public/organizations/{slug}/campaigns")]
	[OutputCache(PolicyName = "PublicOrganizationCampaigns")]
	[ProducesResponseType(typeof(PublicListResponse<PublicCampaignDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetOrganizationCampaigns(
		string slug,
		[FromQuery] CampaignStatus? status,
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 12,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(
			new GetPublicOrganizationCampaignsQuery(slug, status, page, pageSize), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("/api/public/organizations/{slug}/transparency")]
	[OutputCache(PolicyName = "PublicTransparency")]
	[ProducesResponseType(typeof(TransparencyDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetTransparency(string slug, CancellationToken ct)
	{
		var result = await _sender.Send(new GetOrganizationTransparencyQuery(slug), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("/api/public/campaigns/{id:guid}")]
	[OutputCache(PolicyName = "PublicCampaign")]
	[ProducesResponseType(typeof(PublicCampaignDetailDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetCampaign(Guid id, CancellationToken ct)
	{
		var result = await _sender.Send(new GetPublicCampaignQuery(id), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("/api/public/campaigns/{id:guid}/receipts")]
	[OutputCache(PolicyName = "PublicCampaignReceipts")]
	[ProducesResponseType(typeof(PublicListResponse<PublicReceiptDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetCampaignReceipts(
		Guid id,
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 20,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetPublicCampaignReceiptsQuery(id, page, pageSize), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("/api/public/receipts/{id:guid}")]
	[OutputCache(PolicyName = "PublicReceipt")]
	[ProducesResponseType(typeof(PublicReceiptDetailDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetReceipt(Guid id, CancellationToken ct)
	{
		var result = await _sender.Send(new GetPublicReceiptQuery(id), ct);
		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}
}
