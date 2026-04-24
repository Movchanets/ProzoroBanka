namespace ProzoroBanka.Infrastructure.Identity;

public static class ApplicationRoles
{
	public const string Volunteer = "Volunteer";
	public const string Moderator = "Moderator";
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
			"users.self",
			"invitation.accept"
		]);

	public static ApplicationRoleDefinition Moderator { get; } = new(
		ApplicationRoles.Moderator,
		"Модератор",
		[
			"users.self",
			"invitation.accept",
			"users.read",
			"users.update",
			"users.delete",
			"users.manage_roles",
			"users.impersonate"
		]);

	public static ApplicationRoleDefinition Accountant { get; } = new(
		ApplicationRoles.Accountant,
		"Бухгалтер",
		[
			"users.self",
			"invitation.accept"
		]);

	public static ApplicationRoleDefinition Admin { get; } = new(
		ApplicationRoles.Admin,
		"Адміністратор",
		[
			"users.self",
			"invitation.accept",
			"system.settings",
			"organizations.manage",
			"organizations.plan.manage"
		]);

	public static IReadOnlyCollection<ApplicationRoleDefinition> All { get; } =
		[
			Volunteer,
			Moderator,
			Accountant,
			Admin
		];

	public static ApplicationRoleDefinition? FindByName(string roleName)
	{
		return All.FirstOrDefault(role =>
			string.Equals(role.Name, roleName, StringComparison.OrdinalIgnoreCase));
	}
}