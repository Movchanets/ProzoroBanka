using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.Infrastructure.Identity;

namespace ProzoroBanka.Infrastructure.Initializer;

public static class IdentitySeeder
{
	public static async Task SeedAsync(
		IServiceProvider serviceProvider,
		IConfiguration configuration,
		IHostEnvironment environment,
		CancellationToken cancellationToken = default)
	{
		using var scope = serviceProvider.CreateScope();
		var services = scope.ServiceProvider;

		var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("IdentitySeeder");
		var dbContext = services.GetRequiredService<ApplicationDbContext>();
		var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
		var roleManager = services.GetRequiredService<RoleManager<RoleEntity>>();

		if (dbContext.Database.IsRelational())
		{
			var migrations = dbContext.Database.GetMigrations();
			if (migrations.Any())
				await dbContext.Database.MigrateAsync(cancellationToken);
			else
				await dbContext.Database.EnsureCreatedAsync(cancellationToken);
		}
		else
		{
			await dbContext.Database.EnsureCreatedAsync(cancellationToken);
		}

		foreach (var roleDefinition in ApplicationRoleDefinitions.All)
		{
			await EnsureRoleAsync(roleManager, roleDefinition, cancellationToken);
		}

		await EnsureAdminUserAsync(dbContext, userManager, roleManager, configuration, environment, logger, cancellationToken);
	}

	private static async Task EnsureRoleAsync(
		RoleManager<RoleEntity> roleManager,
		ApplicationRoleDefinition roleDefinition,
		CancellationToken cancellationToken)
	{
		var role = await roleManager.FindByNameAsync(roleDefinition.Name);
		if (role is null)
		{
			var createResult = await roleManager.CreateAsync(new RoleEntity
			{
				Name = roleDefinition.Name,
				Description = roleDefinition.Description
			});

			if (!createResult.Succeeded)
			{
				throw new InvalidOperationException($"Failed to create role '{roleDefinition.Name}': {string.Join("; ", createResult.Errors.Select(e => e.Description))}");
			}

			role = await roleManager.FindByNameAsync(roleDefinition.Name)
				?? throw new InvalidOperationException($"Role '{roleDefinition.Name}' was created but could not be loaded.");
		}

		if (!string.Equals(role.Description, roleDefinition.Description, StringComparison.Ordinal))
		{
			role.Description = roleDefinition.Description;
			await roleManager.UpdateAsync(role);
		}

		var existingClaims = await roleManager.GetClaimsAsync(role);
		foreach (var permission in roleDefinition.Permissions)
		{
			if (existingClaims.Any(claim => claim.Type == "permission" && claim.Value == permission))
				continue;

			await roleManager.AddClaimAsync(role, new Claim("permission", permission));
		}
	}

	private static async Task EnsureAdminUserAsync(
		ApplicationDbContext dbContext,
		UserManager<ApplicationUser> userManager,
		RoleManager<RoleEntity> roleManager,
		IConfiguration configuration,
		IHostEnvironment environment,
		ILogger logger,
		CancellationToken cancellationToken)
	{
		var adminEmail = configuration["Seed:Admin:Email"] ?? "admin@example.com";
		var adminPassword = configuration["Seed:Admin:Password"];
		var firstName = configuration["Seed:Admin:FirstName"] ?? "System";
		var lastName = configuration["Seed:Admin:LastName"] ?? "Administrator";
		var configuredAdminRoles = ParseConfiguredAdminRoles(configuration["Seed:Admin:Roles"]);

		if (string.IsNullOrWhiteSpace(adminPassword))
		{
			if (!environment.IsDevelopment())
			{
				logger.LogInformation("Admin seed user skipped because Seed:Admin:Password is not configured.");
				return;
			}

			adminPassword = "Admin123!ChangeMe";
		}

		var applicationUser = await userManager.FindByEmailAsync(adminEmail);

		if (applicationUser != null)
		{
			logger.LogInformation("Admin user {Email} already exists. Ensuring profile and roles are up to date.", adminEmail);
		}

		User? domainUser = null;

		if (applicationUser?.DomainUserId is Guid domainUserId)
		{
			domainUser = await dbContext.DomainUsers.FirstOrDefaultAsync(user => user.Id == domainUserId, cancellationToken);
		}

		if (domainUser is null)
		{
			domainUser = await dbContext.DomainUsers.FirstOrDefaultAsync(user => user.Email == adminEmail, cancellationToken);
		}

		if (domainUser is null)
		{
			domainUser = new User
			{
				Email = adminEmail,
				FirstName = firstName,
				LastName = lastName,
				IsActive = true
			};

			dbContext.DomainUsers.Add(domainUser);
			await dbContext.SaveChangesAsync(cancellationToken);
		}

		if (applicationUser is null)
		{
			applicationUser = new ApplicationUser
			{
				UserName = adminEmail,
				Email = adminEmail,
				EmailConfirmed = true,
				DomainUserId = domainUser.Id
			};

			var createResult = await userManager.CreateAsync(applicationUser, adminPassword);
			if (!createResult.Succeeded)
			{
				throw new InvalidOperationException($"Failed to create admin user '{adminEmail}': {string.Join("; ", createResult.Errors.Select(e => e.Description))}");
			}

			domainUser.IdentityUserId = applicationUser.Id;
			await dbContext.SaveChangesAsync(cancellationToken);
		}
		else if (applicationUser.DomainUserId != domainUser.Id)
		{
			applicationUser.DomainUserId = domainUser.Id;
			await userManager.UpdateAsync(applicationUser);
		}

		if (domainUser.IdentityUserId != applicationUser.Id)
		{
			domainUser.IdentityUserId = applicationUser.Id;
			await dbContext.SaveChangesAsync(cancellationToken);
		}

		foreach (var roleName in configuredAdminRoles)
		{
			var role = await roleManager.FindByNameAsync(roleName);
			if (role is null)
			{
				var predefinedRole = ApplicationRoleDefinitions.FindByName(roleName);
				if (predefinedRole is not null)
				{
					await EnsureRoleAsync(roleManager, predefinedRole, cancellationToken);
				}
				else
				{
					var createRoleResult = await roleManager.CreateAsync(new RoleEntity
					{
						Name = roleName,
						Description = "Seeded role"
					});

					if (!createRoleResult.Succeeded)
					{
						throw new InvalidOperationException(
							$"Failed to create role '{roleName}' for admin seed: {string.Join("; ", createRoleResult.Errors.Select(e => e.Description))}");
					}
				}
			}

			if (await userManager.IsInRoleAsync(applicationUser, roleName))
				continue;

			var addToRoleResult = await userManager.AddToRoleAsync(applicationUser, roleName);
			if (!addToRoleResult.Succeeded)
			{
				throw new InvalidOperationException(
					$"Failed to assign role '{roleName}' to admin user '{adminEmail}': {string.Join("; ", addToRoleResult.Errors.Select(e => e.Description))}");
			}
		}

		logger.LogInformation("Identity seed completed for admin user {Email}", adminEmail);
	}

	private static IReadOnlyCollection<string> ParseConfiguredAdminRoles(string? configuredRoles)
	{
		if (string.IsNullOrWhiteSpace(configuredRoles))
			return [ApplicationRoles.Admin];

		var roles = configuredRoles
			.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries)
			.Select(role => role.Trim())
			.Where(role => !string.IsNullOrWhiteSpace(role))
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();

		if (roles.Count == 0)
			return [ApplicationRoles.Admin];

		return roles;
	}
}