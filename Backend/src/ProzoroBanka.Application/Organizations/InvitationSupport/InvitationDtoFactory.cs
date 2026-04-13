using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Organizations.InvitationSupport;

/// <summary>
/// Builds invitation DTOs from loaded entities in one place so invitation reads and writes
/// expose the same contract and do not repeat mapping logic across handlers.
/// </summary>
internal static class InvitationDtoFactory
{
	public static InvitationDto Create(
		Invitation invitation,
		IFileStorage fileStorage,
		bool includeEmail,
		bool includeToken)
	{
		return new InvitationDto(
			invitation.Id,
			invitation.OrganizationId,
			invitation.Organization.Name,
			fileStorage.ResolvePublicUrl(invitation.Organization.LogoStorageKey),
			invitation.Inviter.FirstName,
			invitation.Inviter.LastName,
			includeEmail ? invitation.Email : null,
			invitation.DefaultRole,
			invitation.Status,
			invitation.ExpiresAt,
			invitation.CreatedAt,
			includeToken ? invitation.Token : null);
	}
}