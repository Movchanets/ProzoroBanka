namespace ProzoroBanka.Domain.Enums;

[Flags]
public enum OrganizationPermissions
{
	None = 0,
	ManageOrganization = 1 << 0,
	ManageMembers = 1 << 1,
	ManageInvitations = 1 << 2,
	ManageReceipts = 1 << 3,
	ViewReports = 1 << 4,
	UploadLogo = 1 << 5,
	ManageCampaigns = 1 << 6,
	All = ManageOrganization | ManageMembers | ManageInvitations | ManageReceipts | ViewReports | UploadLogo | ManageCampaigns
}
