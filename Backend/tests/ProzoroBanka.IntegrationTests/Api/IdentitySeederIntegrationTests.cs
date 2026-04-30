using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ProzoroBanka.Infrastructure.Identity;
using ProzoroBanka.Infrastructure.Initializer;

namespace ProzoroBanka.IntegrationTests.Api;

public class IdentitySeederIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly TestWebApplicationFactory _factory;

	public IdentitySeederIntegrationTests(TestWebApplicationFactory factory)
	{
		_factory = factory;
	}

	[Fact]
	public async Task SeedAsync_WhenAdminExists_AssignsMissingConfiguredRoles()
	{
		await using var scope = _factory.Services.CreateAsyncScope();
		var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
		var hostEnvironment = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();

		var adminEmail = "admin@example.com";
		var adminUser = await userManager.FindByEmailAsync(adminEmail);
		Assert.NotNull(adminUser);

		if (await userManager.IsInRoleAsync(adminUser!, ApplicationRoles.Volunteer))
		{
			var removeResult = await userManager.RemoveFromRoleAsync(adminUser!, ApplicationRoles.Volunteer);
			Assert.True(removeResult.Succeeded);
		}

		Assert.False(await userManager.IsInRoleAsync(adminUser!, ApplicationRoles.Volunteer));

		var seedConfiguration = new ConfigurationBuilder()
			.AddInMemoryCollection(new Dictionary<string, string?>
			{
				["Seed:Admin:Email"] = adminEmail,
				["Seed:Admin:Password"] = "Admin123!ChangeMe",
				["Seed:Admin:FirstName"] = "System",
				["Seed:Admin:LastName"] = "Administrator",
				["Seed:Admin:Roles"] = $"{ApplicationRoles.Admin}, {ApplicationRoles.Volunteer}"
			})
			.Build();

		await IdentitySeeder.SeedAsync(_factory.Services, seedConfiguration, hostEnvironment, CancellationToken.None);

		adminUser = await userManager.FindByEmailAsync(adminEmail);
		Assert.NotNull(adminUser);
		Assert.True(await userManager.IsInRoleAsync(adminUser!, ApplicationRoles.Admin));
		Assert.True(await userManager.IsInRoleAsync(adminUser!, ApplicationRoles.Volunteer));
	}
}