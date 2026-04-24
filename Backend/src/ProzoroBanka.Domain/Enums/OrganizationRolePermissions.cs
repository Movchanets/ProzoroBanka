namespace ProzoroBanka.Domain.Enums;

public static class OrganizationRolePermissions
{
	public static OrganizationPermissions GetDefaultPermissions(OrganizationRole role)
	{
		return role switch
		{
			OrganizationRole.Owner => OrganizationPermissions.All,
			OrganizationRole.Admin => OrganizationPermissions.All,
			OrganizationRole.Reporter => OrganizationPermissions.ReadOnly
				| OrganizationPermissions.ManageReceipts
				| OrganizationPermissions.ManagePurchases
				| OrganizationPermissions.ManageReceiptVerification,
			_ => OrganizationPermissions.None
		};
	}

	public static OrganizationPermissions GetEffectivePermissions(
		OrganizationRole role,
		OrganizationPermissions persistedPermissions)
	{
		if (role is OrganizationRole.Owner or OrganizationRole.Admin)
			return GetDefaultPermissions(role);

		if (persistedPermissions != OrganizationPermissions.None)
			return persistedPermissions;

		return role switch
		{
			OrganizationRole.Reporter => GetDefaultPermissions(role),
			_ => persistedPermissions
		};
	}
}