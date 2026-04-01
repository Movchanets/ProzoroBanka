using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.Commands.SetOrganizationPlan;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationPlanUsage;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

[ApiController]
[Route("api/admin/organizations")]
[Authorize]
public class AdminOrganizationsController : ControllerBase
{
	private readonly IMediator _mediator;
	private readonly ICurrentUserService _currentUserService;

	public AdminOrganizationsController(IMediator mediator, ICurrentUserService currentUserService)
	{
		_mediator = mediator;
		_currentUserService = currentUserService;
	}

	[HttpPut("{id:guid}/plan")]
	[HasPermission(Permissions.OrganizationsPlanManage)]
	public async Task<ActionResult<ServiceResponse<OrganizationDto>>> SetOrganizationPlan(
		[FromRoute] Guid id,
		[FromBody] SetOrganizationPlanRequest request,
		CancellationToken cancellationToken)
	{
		var userId = _currentUserService.DomainUserId;
		if (userId is null)
			return Unauthorized();

		var command = new SetOrganizationPlanCommand(id, request.PlanType, userId.Value);
		var response = await _mediator.Send(command, cancellationToken);
		
		if (!response.IsSuccess)
			return BadRequest(response);

		return Ok(response);
	}

	[HttpGet("{id:guid}/plan-usage")]
	[HasPermission(Permissions.OrganizationsPlanManage)]
	public async Task<ActionResult<ServiceResponse<OrganizationPlanUsageDto>>> GetOrganizationPlanUsage(
		[FromRoute] Guid id,
		CancellationToken cancellationToken)
	{
		var query = new GetOrganizationPlanUsageQuery(id);
		var response = await _mediator.Send(query, cancellationToken);
		
		if (!response.IsSuccess)
			return BadRequest(response);

		return Ok(response);
	}
}

public record SetOrganizationPlanRequest(OrganizationPlanType PlanType);
