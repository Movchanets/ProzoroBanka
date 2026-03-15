using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ProzoroBanka.Application.Contracts.Email;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Infrastructure.Data;
using Testcontainers.PostgreSql;

namespace ProzoroBanka.IntegrationTests.Api;

public class TestWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder()
		.WithImage("postgres:16-alpine")
		.WithDatabase("prozoro_banka_test")
		.WithUsername("postgres")
		.WithPassword("postgres")
		.Build();

	public async Task InitializeAsync()
	{
		await _postgresContainer.StartAsync();

		_ = CreateClient();

		using var scope = Services.CreateScope();
		var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
		await dbContext.Database.MigrateAsync();
	}

	public new async Task DisposeAsync()
	{
		Dispose();
		await _postgresContainer.DisposeAsync();
	}

	protected override void ConfigureWebHost(IWebHostBuilder builder)
	{
		builder.UseEnvironment("Testing");

		builder.ConfigureAppConfiguration((_, configurationBuilder) =>
		{
			configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
			{
				["ConnectionStrings:DefaultConnection"] = _postgresContainer.GetConnectionString(),
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
			services.RemoveAll<ITurnstileService>();
			services.RemoveAll<IEmailNotificationService>();

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