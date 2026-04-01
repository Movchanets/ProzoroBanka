using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.Application.Admin.Commands.AdminChangeCampaignStatus;
using ProzoroBanka.Application.Admin.Commands.AdminDeleteOrganization;
using ProzoroBanka.Application.Admin.Commands.RemoveUserOrganizationLink;
using ProzoroBanka.Application.Admin.Commands.UpdateAdminGeneralSettings;
using ProzoroBanka.Application.Admin.Commands.UpdateAdminPlansSettings;
using ProzoroBanka.Application.Admin.Commands.UpdateUserLimitsSettings;
using ProzoroBanka.Application.Admin.Commands.UpdateUserOrganizationLink;
using ProzoroBanka.Application.Admin.Commands.VerifyOrganization;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Admin.Queries.GetAllOrganizations;
using ProzoroBanka.Application.Admin.Queries.GetAdminGeneralSettings;
using ProzoroBanka.Application.Admin.Queries.GetAdminPlansSettings;
using ProzoroBanka.Application.Admin.Queries.GetOrganizationCampaigns;
using ProzoroBanka.Application.Admin.Queries.GetUserDetails;
using ProzoroBanka.Application.Admin.Queries.GetUserLimitsSettings;
using ProzoroBanka.Application.Admin.Queries.GetUsers;
using ProzoroBanka.Application.Admin.Queries.GetRoles;
using ProzoroBanka.Application.Users.Commands.DeleteUser;
using ProzoroBanka.Application.Users.Commands.AssignRoles;
using ProzoroBanka.Application.Users.Commands.LockUser;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// Адміністративний контролер: верифікація організацій, керування ними та їхніми зборами.
/// Доступ — тільки для ролі Admin.
/// </summary>
[ApiController]
[Route("api/admin")]
[Produces("application/json")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
	private readonly ISender _sender;

	public AdminController(ISender sender)
	{
		_sender = sender;
	}

	// ── Organizations ──────────────────────────────────────────────────────

	/// <summary>
	/// Отримати всі організації з пагінацією та фільтром верифікації.
	/// </summary>
	[HttpGet("organizations")]
	[OutputCache(PolicyName = "AdminOrganizations")]
	[ProducesResponseType(typeof(AdminOrganizationListResponse), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetAllOrganizations(
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 20,
		[FromQuery] bool? verifiedOnly = null,
		[FromQuery] string? search = null,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetAllOrganizationsQuery(page, pageSize, verifiedOnly, search), ct);
		return Ok(result.Payload);
	}

	/// <summary>
	/// Верифікувати або зняти верифікацію з організації.
	/// </summary>
	[HttpPut("organizations/{id:guid}/verify")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> VerifyOrganization(
		Guid id, [FromBody] VerifyOrganizationRequest request, CancellationToken ct)
	{
		var result = await _sender.Send(new VerifyOrganizationCommand(id, request.IsVerified), ct);

		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	/// <summary>
	/// Видалити організацію адміністратором (soft-delete з каскадом на збори).
	/// </summary>
	[HttpDelete("organizations/{id:guid}")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> DeleteOrganization(Guid id, CancellationToken ct)
	{
		var result = await _sender.Send(new AdminDeleteOrganizationCommand(id), ct);

		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	// ── Campaigns ──────────────────────────────────────────────────────────

	/// <summary>
	/// Отримати всі збори організації (для адміна).
	/// </summary>
	[HttpGet("organizations/{orgId:guid}/campaigns")]
	[OutputCache(PolicyName = "AdminCampaigns")]
	[ProducesResponseType(typeof(IReadOnlyList<AdminCampaignDto>), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetOrganizationCampaigns(
		Guid orgId,
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 20,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetAdminOrganizationCampaignsQuery(orgId, page, pageSize), ct);

		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>
	/// Змінити статус збору адміністратором (без перевірки прав організації).
	/// </summary>
	[HttpPut("campaigns/{id:guid}/status")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> ChangeCampaignStatus(
		Guid id, [FromBody] AdminChangeCampaignStatusRequest request, CancellationToken ct)
	{
		var result = await _sender.Send(new AdminChangeCampaignStatusCommand(id, request.NewStatus), ct);

		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	// ── Users ──────────────────────────────────────────────────────────────

	/// <summary>
	/// Отримати всіх користувачів з пагінацією.
	/// </summary>
	[HttpGet("users")]
	[ProducesResponseType(typeof(AdminUserListResponse), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetUsers(
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 20,
		[FromQuery] string? search = null,
		[FromQuery] bool? isActive = null,
		[FromQuery] string? role = null,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetUsersQuery(page, pageSize, search, isActive, role), ct);
		return Ok(result.Payload);
	}

	[HttpGet("users/{id:guid}")]
	[ProducesResponseType(typeof(AdminUserDetailsDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public async Task<IActionResult> GetUserDetails(Guid id, CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetUserDetailsQuery(id), ct);

		if (!result.IsSuccess)
			return NotFound(new { Error = result.Message });

		return Ok(result.Payload);
	}

	/// <summary>
	/// Отримати всі доступні ролі.
	/// </summary>
	[HttpGet("roles")]
	[OutputCache(Duration = 3600)]
	[ProducesResponseType(typeof(IReadOnlyList<AdminRoleDto>), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetRoles(CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetRolesQuery(), ct);
		return Ok(result.Payload);
	}

	/// <summary>
	/// Змінити ролі користувача (IdentityUserId).
	/// </summary>
	[HttpPut("users/{id:guid}/roles")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> AssignRoles(
		Guid id, [FromBody] AdminAssignRolesRequest request, CancellationToken ct)
	{
		var result = await _sender.Send(new AssignRolesCommand(id, request.Roles), ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	/// <summary>
	/// Заблокувати або розблокувати користувача.
	/// </summary>
	[HttpPut("users/{id:guid}/lockout")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> SetUserLockout(
		Guid id,
		[FromBody] AdminSetUserLockoutRequest request,
		CancellationToken ct)
	{
		var result = await _sender.Send(new LockUserCommand(id, request.Locked), ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	/// <summary>
	/// Видалити користувача (Identity + Domain профіль).
	/// </summary>
	[HttpDelete("users/{id:guid}")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
	{
		var result = await _sender.Send(new DeleteUserCommand(id), ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	[HttpPut("users/{id:guid}/organizations/{organizationId:guid}")]
	[ProducesResponseType(typeof(AdminUserOrganizationLinkDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateUserOrganizationLink(
		Guid id,
		Guid organizationId,
		[FromBody] AdminUpdateUserOrganizationLinkRequest request,
		CancellationToken ct)
	{
		var result = await _sender.Send(
			new UpdateUserOrganizationLinkCommand(id, organizationId, request.Role, request.Permissions),
			ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpDelete("users/{id:guid}/organizations/{organizationId:guid}")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> RemoveUserOrganizationLink(Guid id, Guid organizationId, CancellationToken ct)
	{
		var result = await _sender.Send(new RemoveUserOrganizationLinkCommand(id, organizationId), ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(new { Message = result.Message });
	}

	[HttpGet("settings/users")]
	[HasPermission(Permissions.SystemSettings)]
	[ProducesResponseType(typeof(AdminUserLimitsSettingsDto), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetUserLimitsSettings(CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetUserLimitsSettingsQuery(), ct);
		return Ok(result.Payload);
	}

	[HttpPut("settings/users")]
	[HasPermission(Permissions.SystemSettings)]
	[ProducesResponseType(typeof(AdminUserLimitsSettingsDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateUserLimitsSettings(
		[FromBody] AdminUpdateUserLimitsSettingsRequest request,
		CancellationToken ct)
	{
		var result = await _sender.Send(
			new UpdateUserLimitsSettingsCommand(request.MaxOwnedOrganizationsForNonAdmin),
			ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("settings/plans")]
	[HasPermission(Permissions.SystemSettings)]
	[ProducesResponseType(typeof(AdminPlansSettingsDto), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetAdminPlansSettings(CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetAdminPlansSettingsQuery(), ct);
		return Ok(result.Payload);
	}

	[HttpPut("settings/plans")]
	[HasPermission(Permissions.SystemSettings)]
	[ProducesResponseType(typeof(AdminPlansSettingsDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateAdminPlansSettings(
		[FromBody] AdminUpdatePlansSettingsRequest request,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(new UpdateAdminPlansSettingsCommand(request.Free, request.Paid), ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}

	[HttpGet("settings/general")]
	[HasPermission(Permissions.SystemSettings)]
	[ProducesResponseType(typeof(AdminGeneralSettingsDto), StatusCodes.Status200OK)]
	public async Task<IActionResult> GetAdminGeneralSettings(CancellationToken ct = default)
	{
		var result = await _sender.Send(new GetAdminGeneralSettingsQuery(), ct);
		return Ok(result.Payload);
	}

	[HttpPut("settings/general")]
	[HasPermission(Permissions.SystemSettings)]
	[ProducesResponseType(typeof(AdminGeneralSettingsDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateAdminGeneralSettings(
		[FromBody] AdminUpdateGeneralSettingsRequest request,
		CancellationToken ct = default)
	{
		var result = await _sender.Send(
			new UpdateAdminGeneralSettingsCommand(
				request.MaxOwnedOrganizationsForNonAdmin,
				request.MaxJoinedOrganizationsForNonAdmin),
			ct);

		if (!result.IsSuccess)
			return BadRequest(new { Error = result.Message });

		return Ok(result.Payload);
	}
}
