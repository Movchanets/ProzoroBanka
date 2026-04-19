namespace ProzoroBanka.API.Authorization;

/// <summary>
/// Константи всіх дозволів системи (permission-based authorization).
/// </summary>
public static class Permissions
{
	// ── Receipts ──
	public const string ReceiptsRead = "receipts.read";
	public const string ReceiptsCreate = "receipts.create";
	public const string ReceiptsUpdate = "receipts.update";
	public const string ReceiptsDelete = "receipts.delete";
	public const string ReceiptsVerify = "receipts.verify";

	// ── Users ──
	public const string UsersRead = "users.read";
	public const string UsersUpdate = "users.update";
	public const string UsersDelete = "users.delete";
	public const string UsersManageRoles = "users.manage_roles";

	// ── Reports ──
	public const string ReportsRead = "reports.read";
	public const string ReportsExport = "reports.export";

	// ── Monobank ──
	public const string MonobankSync = "monobank.sync";
	public const string MonobankRead = "monobank.read";

	// ── Organizations ──
	public const string OrganizationsCreate = "organizations.create";
	public const string OrganizationsRead = "organizations.read";
	public const string OrganizationsUpdate = "organizations.update";
	public const string OrganizationsDelete = "organizations.delete";
	public const string OrganizationsManage = "organizations.manage";
	public const string OrganizationsMembersManage = "organizations.members.manage";
	public const string OrganizationsPlanManage = "organizations.plan.manage";

	// ── Campaigns ──
	public const string CampaignsManage = "campaigns.manage";
	public const string CampaignsLogsRead = "campaigns.logs.read";

	// ── Purchases ──
	public const string PurchasesManage = "purchases.manage";

	// ── System ──
	public const string SystemSettings = "system.settings";
}
