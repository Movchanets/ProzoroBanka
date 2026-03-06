using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ProzoroBanka.Application.Contracts.Email;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.IntegrationTests.Api;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
	private readonly string _databaseName = $"prozoro-auth-tests-{Guid.NewGuid():N}";
	private readonly InMemoryDatabaseRoot _databaseRoot = new();

	protected override void ConfigureWebHost(IWebHostBuilder builder)
	{
		builder.UseEnvironment("Testing");

		builder.ConfigureAppConfiguration((_, configurationBuilder) =>
		{
			configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
			{
				["Jwt:Key"] = "TestSecretKeyAtLeast32Characters!!123",
				["Jwt:Issuer"] = "ProzoroBanka-Test",
				["Jwt:Audience"] = "ProzoroBanka-Test",
				["Jwt:AccessTokenExpirationMinutes"] = "60",
				["Jwt:RefreshTokenExpirationDays"] = "7",
				["Google:ClientId"] = "test-client-id",
				["Google:ClientSecret"] = "test-client-secret",
				["Seed:Admin:Email"] = "admin@example.com",
				["Seed:Admin:Password"] = "Admin123!ChangeMe",
				["Seed:Admin:FirstName"] = "System",
				["Seed:Admin:LastName"] = "Administrator",
				["Storage:Provider"] = "Local",
				["Storage:Local:FolderName"] = "uploads-test",
				["Turnstile:SecretKey"] = "test-secret",
				["Redis:Enabled"] = "false",
				["Redis:ConnectionString"] = ""
			});
		});

		builder.ConfigureServices(services =>
		{
			services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
			services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
			services.RemoveAll<ApplicationDbContext>();
			services.RemoveAll<IApplicationDbContext>();
			services.RemoveAll<ITurnstileService>();
			services.RemoveAll<IEmailNotificationService>();

			services.AddDbContext<ApplicationDbContext>(options =>
				options.UseInMemoryDatabase(_databaseName, _databaseRoot));
			services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
			services.AddSingleton<ITurnstileService, AlwaysValidTurnstileService>();
			services.AddSingleton<IEmailNotificationService, NoOpEmailNotificationService>();
		});
	}

	private sealed class AlwaysValidTurnstileService : ITurnstileService
	{
		public Task<bool> ValidateAsync(string token, string? remoteIp = null, CancellationToken ct = default)
		{
			return Task.FromResult(true);
		}
	}

	private sealed class NoOpEmailNotificationService : IEmailNotificationService
	{
		public Task SendEmailAsync(ISendEmailCommand command, CancellationToken cancellationToken = default) => Task.CompletedTask;
		public Task SendTemplatedEmailAsync(string templateName, string to, object templateData, CancellationToken cancellationToken = default) => Task.CompletedTask;
		public Task ScheduleEmailAsync(ISendEmailCommand command, DateTime scheduledTime, CancellationToken cancellationToken = default) => Task.CompletedTask;
	}
}