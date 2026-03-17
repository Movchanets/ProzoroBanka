using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Service for invitation management operations.
/// </summary>
public interface IInvitationService
{
	/// <summary>Create public invitation link for organization.</summary>
	Task<ServiceResponse<InvitationDto>> CreateInviteLinkAsync(
		Guid organizationId,
		Guid callerUserId,
		OrganizationRole role,
		int expiresInHours,
		CancellationToken cancellationToken = default);

	/// <summary>Send email invitation to specific email address.</summary>
	Task<ServiceResponse<InvitationDto>> InviteByEmailAsync(
		Guid organizationId,
		Guid callerUserId,
		string email,
		OrganizationRole role,
		CancellationToken cancellationToken = default);

	/// <summary>Get invitation details by token.</summary>
	Task<ServiceResponse<InvitationDto>> GetByTokenAsync(
		string token,
		CancellationToken cancellationToken = default);

	/// <summary>Get pending invitations for logged-in user.</summary>
	Task<ServiceResponse<IReadOnlyList<InvitationDto>>> GetUserInvitationsAsync(
		Guid userId,
		CancellationToken cancellationToken = default);

	/// <summary>Get invitations sent by organization (admin view).</summary>
	Task<ServiceResponse<IReadOnlyList<InvitationDto>>> GetOrganizationInvitationsAsync(
		Guid organizationId,
		Guid callerUserId,
		CancellationToken cancellationToken = default);

	/// <summary>Accept invitation by token (join organization).</summary>
	Task<ServiceResponse> AcceptAsync(
		string token,
		Guid userId,
		CancellationToken cancellationToken = default);

	/// <summary>Decline invitation by token.</summary>
	Task<ServiceResponse> DeclineAsync(
		string token,
		Guid userId,
		CancellationToken cancellationToken = default);

	/// <summary>Cancel/revoke invitation (admin action).</summary>
	Task<ServiceResponse> CancelAsync(
		Guid invitationId,
		Guid organizationId,
		Guid callerUserId,
		CancellationToken cancellationToken = default);
}
