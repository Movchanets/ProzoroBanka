using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Infrastructure.Data;
using Testcontainers.PostgreSql;

namespace ProzoroBanka.UnitTests.Infrastructure;

[CollectionDefinition("PostgreSQL")]
public class PostgreSqlCollection : ICollectionFixture<PostgreSqlUnitTestFixture> { }

/// <summary>
/// Shared Testcontainers PostgreSQL fixture for unit tests that require a real database.
/// All test classes decorated with [Collection("PostgreSQL")] share one container instance.
/// </summary>
public class PostgreSqlUnitTestFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
		.WithImage("postgres:16-alpine")
		.Build();

	public async Task InitializeAsync()
	{
		await _container.StartAsync();

		await using var ctx = CreateContext();
		await ctx.Database.EnsureCreatedAsync();
	}

	public async Task DisposeAsync() => await _container.DisposeAsync();

	/// <summary>Creates a fresh <see cref="ApplicationDbContext"/> connected to the shared container.</summary>
	public ApplicationDbContext CreateContext()
	{
		var opts = new DbContextOptionsBuilder<ApplicationDbContext>()
			.UseNpgsql(_container.GetConnectionString())
			.Options;
		return new ApplicationDbContext(opts);
	}
}
