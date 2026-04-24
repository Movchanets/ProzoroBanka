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
		await EnsureDefaultOcrModelAsync(dbContext, logger, cancellationToken);
		await EnsureDefaultCampaignCategoriesAsync(dbContext, logger, cancellationToken);
	}

	private sealed record SeedCampaignCategory(string Slug, string NameUk, string NameEn, int SortOrder);

	private static readonly IReadOnlyList<SeedCampaignCategory> DefaultCampaignCategories =
	[
		new("military-equipment", "Військове спорядження", "Military equipment", 10),
		new("medical-aid", "Медична допомога", "Medical aid", 20),
		new("transport-logistics", "Транспорт і логістика", "Transport and logistics", 30),
		new("communications", "Зв'язок та РЕБ", "Communications and EW", 40),
		new("humanitarian", "Гуманітарна допомога", "Humanitarian aid", 50),
		new("education-rehab", "Навчання та реабілітація", "Education and rehabilitation", 60),
	];

	private static async Task EnsureDefaultCampaignCategoriesAsync(
		ApplicationDbContext dbContext,
		ILogger logger,
		CancellationToken cancellationToken)
	{
		var slugs = DefaultCampaignCategories.Select(c => c.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);

		var existingBySlug = await dbContext.CampaignCategories
			.IgnoreQueryFilters()
			.Where(c => slugs.Contains(c.Slug))
			.ToDictionaryAsync(c => c.Slug, StringComparer.OrdinalIgnoreCase, cancellationToken);

		var changed = false;
		var createdCount = 0;

		foreach (var seed in DefaultCampaignCategories)
		{
			if (!existingBySlug.TryGetValue(seed.Slug, out var category))
			{
				dbContext.CampaignCategories.Add(new CampaignCategory
				{
					Slug = seed.Slug,
					NameUk = seed.NameUk,
					NameEn = seed.NameEn,
					SortOrder = seed.SortOrder,
					IsActive = true,
				});

				createdCount++;
				changed = true;
				continue;
			}

			if (!string.Equals(category.NameUk, seed.NameUk, StringComparison.Ordinal))
			{
				category.NameUk = seed.NameUk;
				changed = true;
			}

			if (!string.Equals(category.NameEn, seed.NameEn, StringComparison.Ordinal))
			{
				category.NameEn = seed.NameEn;
				changed = true;
			}

			if (category.SortOrder != seed.SortOrder)
			{
				category.SortOrder = seed.SortOrder;
				changed = true;
			}

			if (!category.IsActive)
			{
				category.IsActive = true;
				changed = true;
			}

			if (category.IsDeleted)
			{
				category.IsDeleted = false;
				changed = true;
			}
		}

		if (!changed)
			return;

		await dbContext.SaveChangesAsync(cancellationToken);
		logger.LogInformation("Default campaign categories ensured. Created {CreatedCount}.", createdCount);
	}

	private static async Task EnsureDefaultOcrModelAsync(
		ApplicationDbContext dbContext,
		ILogger logger,
		CancellationToken cancellationToken)
	{
		const string defaultModelIdentifier = "mistral-ocr-latest";
		const string defaultModelName = "Mistral OCR Latest";
		const string defaultProvider = "MistralNative";

		var hasDefault = await dbContext.OcrModelConfigs
			.AnyAsync(m => m.IsActive && m.IsDefault, cancellationToken);

		var model = await dbContext.OcrModelConfigs
			.FirstOrDefaultAsync(m => m.ModelIdentifier == defaultModelIdentifier, cancellationToken);

		if (model is null)
		{
			model = new OcrModelConfig
			{
				Name = defaultModelName,
				ModelIdentifier = defaultModelIdentifier,
				Provider = defaultProvider,
				IsActive = true,
				IsDefault = !hasDefault
			};

			dbContext.OcrModelConfigs.Add(model);
			await dbContext.SaveChangesAsync(cancellationToken);
			logger.LogInformation("Default OCR model {ModelIdentifier} seeded.", defaultModelIdentifier);
			return;
		}

		var changed = false;
		if (!string.Equals(model.Provider, defaultProvider, StringComparison.Ordinal))
		{
			model.Provider = defaultProvider;
			changed = true;
		}

		if (!model.IsActive)
		{
			model.IsActive = true;
			changed = true;
		}

		if (!hasDefault && !model.IsDefault)
		{
			model.IsDefault = true;
			changed = true;
		}

		if (changed)
		{
			await dbContext.SaveChangesAsync(cancellationToken);
			logger.LogInformation("Default OCR model {ModelIdentifier} updated during seed.", defaultModelIdentifier);
		}
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
		var existingPermissions = existingClaims
			.Where(claim => claim.Type == "permission" && !string.IsNullOrWhiteSpace(claim.Value))
			.Select(claim => claim.Value!)
			.ToHashSet(StringComparer.OrdinalIgnoreCase);
		var expectedPermissions = roleDefinition.Permissions
			.Where(permission => !string.IsNullOrWhiteSpace(permission))
			.ToHashSet(StringComparer.OrdinalIgnoreCase);

		foreach (var obsoletePermission in existingPermissions.Except(expectedPermissions).ToList())
		{
			await roleManager.RemoveClaimAsync(role, new Claim("permission", obsoletePermission));
		}

		foreach (var permission in expectedPermissions.Except(existingPermissions))
		{
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
			return ApplicationRoleDefinitions.All.Select(role => role.Name).ToArray();

		var roles = configuredRoles
			.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries)
			.Select(role => role.Trim())
			.Where(role => !string.IsNullOrWhiteSpace(role))
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();

		if (roles.Count == 0)
			return ApplicationRoleDefinitions.All.Select(role => role.Name).ToArray();

		return roles;
	}
}