using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Organizations.Commands.CreateOrganization;
using ProzoroBanka.Application.Organizations.Commands.DeleteOrganization;
using ProzoroBanka.Application.Organizations.Commands.UpdateOrganization;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.Queries.GetMyOrganizations;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationById;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationMembers;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// CRUD організацій та керування учасниками і запрошеннями.
/// </summary>
[Authorize]
public class OrganizationsController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public OrganizationsController(ISender sender, ICurrentUserService currentUser)
	{
		_sender = sender;
		_currentUser = currentUser;
	}

	// ── Organizations CRUD ──────────────────────────────────────────────────

	/// <summary>Створити нову організацію. Поточний користувач стає Owner.</summary>
	[HttpPost]
	[ProducesResponseType(typeof(OrganizationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Create([FromBody] CreateOrganizationRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new CreateOrganizationCommand(
			domainUserId.Value, request.Name, request.Description, request.Website, request.ContactEmail);

		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: BadRequest(new { Error = result.Message });
	}

	/// <summary>Отримати всі організації поточного користувача.</summary>
	[HttpGet("my")]
	[ProducesResponseType(typeof(IReadOnlyList<OrganizationDto>), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetMy(CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetMyOrganizationsQuery(domainUserId.Value), ct);
		return Ok(result.Payload);
	}

	/// <summary>Отримати організацію за ID (тільки для членів організації).</summary>
	[HttpGet("{id:guid}")]
	[ProducesResponseType(typeof(OrganizationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetOrganizationByIdQuery(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Оновити організацію (потрібно мати дозвіл ManageOrganization).</summary>
	[HttpPut("{id:guid}")]
	[ProducesResponseType(typeof(OrganizationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Update(
		Guid id, [FromBody] UpdateOrganizationRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new UpdateOrganizationCommand(
			domainUserId.Value, id, request.Name, request.Description, request.Website, request.ContactEmail);

		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Видалити організацію (тільки Owner).</summary>
	[HttpDelete("{id:guid}")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new DeleteOrganizationCommand(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return NoContent();
	}

	// ── Members ──────────────────────────────────────────────────────────────

	/// <summary>Отримати список учасників організації (тільки для членів).</summary>
	[HttpGet("{id:guid}/members")]
	[ProducesResponseType(typeof(IReadOnlyList<OrganizationMemberDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetMembers(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetOrganizationMembersQuery(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}
}
