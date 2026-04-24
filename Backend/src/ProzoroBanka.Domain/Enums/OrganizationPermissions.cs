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
	ManagePurchases = 1 << 7,
	ManageReceiptVerification = 1 << 8,
	ManageMonobank = 1 << 9,
	ExportReports = 1 << 10,
	ViewMembers = 1 << 11,
	ViewInvitations = 1 << 12,
	ReadOnly = 1 << 13,
	All = ManageOrganization
		| ManageMembers
		| ManageInvitations
		| ManageReceipts
		| ViewReports
		| UploadLogo
		| ManageCampaigns
		| ManagePurchases
		| ManageReceiptVerification
		| ManageMonobank
		| ExportReports
		| ViewMembers
		| ViewInvitations
		| ReadOnly
}
