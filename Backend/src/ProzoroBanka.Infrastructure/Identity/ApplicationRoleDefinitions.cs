namespace ProzoroBanka.Infrastructure.Identity;

public static class ApplicationRoles
{
	public const string Volunteer = "Volunteer";
	public const string Accountant = "Accountant";
	public const string Admin = "Admin";
}

internal sealed record ApplicationRoleDefinition(
	string Name,
	string Description,
	IReadOnlyCollection<string> Permissions);

internal static class ApplicationRoleDefinitions
{
	public static ApplicationRoleDefinition Volunteer { get; } = new(
		ApplicationRoles.Volunteer,
		"Волонтер",
		[
			"receipts.read",
			"receipts.create",
			"receipts.update",
			"receipts.delete",
			"monobank.read"
		]);

	public static ApplicationRoleDefinition Accountant { get; } = new(
		ApplicationRoles.Accountant,
		"Бухгалтер",
		[
			"receipts.read",
			"receipts.verify",
			"reports.read",
			"reports.export",
			"monobank.read",
			"monobank.sync"
		]);

	public static ApplicationRoleDefinition Admin { get; } = new(
		ApplicationRoles.Admin,
		"Адміністратор",
		[
			"receipts.read",
			"receipts.create",
			"receipts.update",
			"receipts.delete",
			"receipts.verify",
			"users.read",
			"users.update",
			"users.delete",
			"users.manage_roles",
			"reports.read",
			"reports.export",
			"monobank.sync",
			"monobank.read",
			"system.settings"
		]);

	public static IReadOnlyCollection<ApplicationRoleDefinition> All { get; } =
		[
			Volunteer,
			Accountant,
			Admin
		];

	public static ApplicationRoleDefinition? FindByName(string roleName)
	{
		return All.FirstOrDefault(role =>
			string.Equals(role.Name, roleName, StringComparison.OrdinalIgnoreCase));
	}
}