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

	// ── System ──
	public const string SystemSettings = "system.settings";
}
