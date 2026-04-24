using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.Commands.CancelInvitation;
using ProzoroBanka.Application.Organizations.Commands.DeleteStateRegistryCredential;
using ProzoroBanka.Application.Organizations.Commands.CreateInviteLink;
using ProzoroBanka.Application.Organizations.Commands.CreateOrganization;
using ProzoroBanka.Application.Organizations.Commands.DeleteOrganization;
using ProzoroBanka.Application.Organizations.Commands.InviteByEmail;
using ProzoroBanka.Application.Organizations.Commands.LeaveOrganization;
using ProzoroBanka.Application.Organizations.Commands.RemoveMember;
using ProzoroBanka.Application.Organizations.Commands.UpsertStateRegistryCredential;
using ProzoroBanka.Application.Organizations.Commands.UpdateMemberRole;
using ProzoroBanka.Application.Organizations.Commands.UpdateOrganization;
using ProzoroBanka.Application.Organizations.Commands.UploadOrganizationLogo;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.Queries.GetMyOrganizations;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationById;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationInvitations;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationMembers;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationStateRegistrySettings;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// CRUD організацій та керування учасниками і запрошеннями.
/// </summary>
[Authorize]
public class OrganizationsController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly ICurrentUserService _currentUser;

	public OrganizationsController(
		ISender sender,
		ICurrentUserService currentUser)
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
		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
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
	[HasOrganizationPermission(OrganizationPermissions.ManageOrganization)]
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
			domainUserId.Value, id, request.Name, request.Description, request.Website, request.ContactEmail, request.Phone);

		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Видалити організацію (тільки Owner).</summary>
	[HttpDelete("{id:guid}")]
	[HasOrganizationPermission(OrganizationPermissions.ManageOrganization)]
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

	/// <summary>Змінити роль учасника організації (потрібно ManageMembers).</summary>
	[HttpPut("{id:guid}/members/{userId:guid}")]
	[HasOrganizationPermission(OrganizationPermissions.ManageMembers)]
	[ProducesResponseType(typeof(OrganizationMemberDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> UpdateMemberRole(
		Guid id, Guid userId, [FromBody] UpdateMemberRoleRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new UpdateMemberRoleCommand(
			domainUserId.Value, id, userId, request.NewRole, request.NewPermissionsFlags);
		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Видалити учасника з організації (потрібно ManageMembers).</summary>
	[HttpDelete("{id:guid}/members/{userId:guid}")]
	[HasOrganizationPermission(OrganizationPermissions.ManageMembers)]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new RemoveMemberCommand(domainUserId.Value, id, userId), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return NoContent();
	}

	/// <summary>Вийти з організації (Owner не може вийти).</summary>
	[HttpPost("{id:guid}/leave")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> Leave(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new LeaveOrganizationCommand(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не є учасником")
				? NotFound(new { Error = result.Message })
				: BadRequest(new { Error = result.Message });

		return NoContent();
	}

	/// <summary>Завантажити логотип організації (потрібно UploadLogo permission).</summary>
	[HttpPost("{id:guid}/logo")]
	[Consumes("multipart/form-data")]
	[HasOrganizationPermission(OrganizationPermissions.UploadLogo)]
	[ProducesResponseType(typeof(OrganizationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> UploadLogo(Guid id, [FromForm] IFormFile? file, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл логотипу обов'язковий." });

		await using var fileStream = file.OpenReadStream();
		var command = new UploadOrganizationLogoCommand(
			domainUserId.Value, id, fileStream, file.FileName, file.ContentType, file.Length);
		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Отримати налаштування ключів держреєстрів і usage по OCR/state.</summary>
	[HttpGet("{id:guid}/state-registry-settings")]
	[HasOrganizationPermission(OrganizationPermissions.ReadOnly)]
	[ProducesResponseType(typeof(OrganizationStateRegistrySettingsDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> GetStateRegistrySettings(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var response = await _sender.Send(new GetOrganizationStateRegistrySettingsQuery(domainUserId.Value, id), ct);
		if (!response.IsSuccess || response.Payload is null)
			return response.Message.Contains("не знайдено")
				? NotFound(new { Error = response.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = response.Message });

		return Ok(response.Payload);
	}

	/// <summary>Додати або оновити API-ключ для провайдера держреєстру.</summary>
	[HttpPut("{id:guid}/state-registry-credentials/{provider}")]
	[HasOrganizationPermission(OrganizationPermissions.ManageOrganization)]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> UpsertStateRegistryCredential(
		Guid id,
		RegistryProvider provider,
		[FromBody] UpsertStateRegistryCredentialRequest request,
		CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new UpsertStateRegistryCredentialCommand(domainUserId.Value, id, provider, request.ApiKey),
			ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	/// <summary>Видалити API-ключ для провайдера держреєстру.</summary>
	[HttpDelete("{id:guid}/state-registry-credentials/{provider}")]
	[HasOrganizationPermission(OrganizationPermissions.ManageOrganization)]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	public async Task<IActionResult> DeleteStateRegistryCredential(Guid id, RegistryProvider provider, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(
			new DeleteStateRegistryCredentialCommand(domainUserId.Value, id, provider),
			ct);
		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	// ── Invitations ──────────────────────────────────────────────────────────

	/// <summary>Створити посилання-запрошення до організації (потрібно ManageInvitations).</summary>
	[HttpPost("{id:guid}/invites/link")]
	[HasOrganizationPermission(OrganizationPermissions.ManageInvitations)]
	[ProducesResponseType(typeof(InvitationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> CreateInviteLink(
		Guid id, [FromBody] CreateInviteLinkRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new CreateInviteLinkCommand(domainUserId.Value, id, request.Role, request.ExpiresInHours);
		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Запросити учасника за email (потрібно ManageInvitations).</summary>
	[HttpPost("{id:guid}/invites/email")]
	[HasOrganizationPermission(OrganizationPermissions.ManageInvitations)]
	[ProducesResponseType(typeof(InvitationDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> InviteByEmail(
		Guid id, [FromBody] InviteByEmailRequest request, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var command = new InviteByEmailCommand(domainUserId.Value, id, request.Email, request.Role);
		var result = await _sender.Send(command, ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Переглянути всі запрошення організації (потрібно ManageInvitations).</summary>
	[HttpGet("{id:guid}/invites")]
	[HasOrganizationPermission(OrganizationPermissions.ManageInvitations)]
	[ProducesResponseType(typeof(IReadOnlyList<InvitationDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetInvitations(Guid id, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new GetOrganizationInvitationsQuery(domainUserId.Value, id), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>Скасувати запрошення (потрібно ManageInvitations або бути автором).</summary>
	[HttpDelete("{id:guid}/invites/{inviteId:guid}")]
	[HasOrganizationPermission(OrganizationPermissions.ManageInvitations)]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	[ProducesResponseType(StatusCodes.Status403Forbidden)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> CancelInvitation(Guid id, Guid inviteId, CancellationToken ct)
	{
		var domainUserId = _currentUser.DomainUserId;
		if (domainUserId is null)
			return Unauthorized();

		var result = await _sender.Send(new CancelInvitationCommand(domainUserId.Value, id, inviteId), ct);

		if (!result.IsSuccess)
			return result.Message.Contains("не знайдено")
				? NotFound(new { Error = result.Message })
				: result.Message.Contains("Недостатньо прав")
					? StatusCode(StatusCodes.Status403Forbidden, new { Error = result.Message })
					: BadRequest(new { Error = result.Message });

		return NoContent();
	}
}

public record UpsertStateRegistryCredentialRequest(string ApiKey);
