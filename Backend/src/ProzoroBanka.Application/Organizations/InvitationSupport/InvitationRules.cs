using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.InvitationSupport;

/// <summary>
/// Shared invitation rules used by command and query handlers.
/// This keeps status semantics and default permission mapping consistent.
/// </summary>
internal static class InvitationRules
{
	public static bool IsExpired(Invitation invitation, DateTime utcNow)
		=> invitation.ExpiresAt < utcNow;

	public static OrganizationPermissions GetPermissionsForRole(OrganizationRole role)
	{
		return role switch
		{
			OrganizationRole.Admin => OrganizationPermissions.All,
			OrganizationRole.Reporter => OrganizationPermissions.ReadOnly
				| OrganizationPermissions.ManageReceipts
				| OrganizationPermissions.ManagePurchases,
			_ => OrganizationPermissions.None
		};
	}

	public static string GetInactiveMessage(InvitationStatus status)
	{
		return status switch
		{
			InvitationStatus.Cancelled => "Запрошення скасовано",
			InvitationStatus.Accepted => "Запрошення вже використано або скасовано",
			InvitationStatus.Declined => "Запрошення вже використано або скасовано",
			InvitationStatus.Expired => "Термін дії запрошення закінчився",
			_ => "Запрошення вже використано або скасовано"
		};
	}
}