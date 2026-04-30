using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Identity;
using ProzoroBanka.Infrastructure.Services.Auth;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Infrastructure.Services;

[Collection("PostgreSQL")]
public class TokenServiceTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public TokenServiceTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task GenerateTokensForUserAsync_UsesRoleDefaults_ForZeroMaskReporterMembershipInOrgPermissionsClaim()
	{
		await using var db = _fixture.CreateContext();

		var ownerDomainUserId = Guid.NewGuid();
		var reporterDomainUserId = Guid.NewGuid();
		var applicationUserId = Guid.NewGuid();
		var organizationId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User
			{
				Id = ownerDomainUserId,
				Email = $"owner-{ownerDomainUserId:N}@test.com",
				FirstName = "Owner",
				LastName = "User"
			},
			new User
			{
				Id = reporterDomainUserId,
				Email = $"reporter-{reporterDomainUserId:N}@test.com",
				FirstName = "Reporter",
				LastName = "User"
			});

		db.Organizations.Add(new Organization
		{
			Id = organizationId,
			Name = "Token Claim Org",
			Slug = $"token-claim-org-{organizationId:N}",
			OwnerUserId = ownerDomainUserId
		});

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = organizationId,
			UserId = reporterDomainUserId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.None,
			JoinedAt = DateTime.UtcNow
		});

		db.Set<ApplicationUser>().Add(new ApplicationUser
		{
			Id = applicationUserId,
			Email = $"reporter-{applicationUserId:N}@test.com",
			UserName = $"reporter-{applicationUserId:N}@test.com",
			DomainUserId = reporterDomainUserId
		});

		await db.SaveChangesAsync();

		var configuration = new ConfigurationBuilder()
			.AddInMemoryCollection(new Dictionary<string, string?>
			{
				["Jwt:Key"] = "unit-test-jwt-key-with-sufficient-length-12345",
				["Jwt:Issuer"] = "prozoro-tests",
				["Jwt:Audience"] = "prozoro-tests",
				["Jwt:AccessTokenExpirationMinutes"] = "30",
				["Jwt:RefreshTokenExpirationDays"] = "7"
			})
			.Build();

		var fileStorage = new Mock<IFileStorage>();
		var logger = new Mock<ILogger<TokenService>>();

		var service = new TokenService(configuration, db, fileStorage.Object, new Mock<IAuthSessionStore>().Object, logger.Object);
		var tokenResponse = await service.GenerateTokensForUserAsync(applicationUserId, CancellationToken.None);

		var jwt = new JwtSecurityTokenHandler().ReadJwtToken(tokenResponse.AccessToken);
		var orgPermissionsClaim = jwt.Claims.Single(claim => claim.Type == "org_permissions").Value;
		var payload = JsonSerializer.Deserialize<Dictionary<string, int>>(orgPermissionsClaim);

		Assert.NotNull(payload);
		Assert.True(payload!.TryGetValue($"org_{organizationId:D}", out var reporterMask));
		Assert.Equal((int)OrganizationRolePermissions.GetDefaultPermissions(OrganizationRole.Reporter), reporterMask);
	}

	[Fact]
	public async Task GenerateTokensForUserAsync_NormalizesLegacyAdminMask_ToAllInOrgPermissionsClaim()
	{
		await using var db = _fixture.CreateContext();

		var ownerDomainUserId = Guid.NewGuid();
		var adminDomainUserId = Guid.NewGuid();
		var applicationUserId = Guid.NewGuid();
		var organizationId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User
			{
				Id = ownerDomainUserId,
				Email = $"owner-{ownerDomainUserId:N}@test.com",
				FirstName = "Owner",
				LastName = "User"
			},
			new User
			{
				Id = adminDomainUserId,
				Email = $"admin-{adminDomainUserId:N}@test.com",
				FirstName = "Admin",
				LastName = "User"
			});

		db.Organizations.Add(new Organization
		{
			Id = organizationId,
			Name = "Token Claim Admin Org",
			Slug = $"token-claim-admin-org-{organizationId:N}",
			OwnerUserId = ownerDomainUserId
		});

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = organizationId,
			UserId = adminDomainUserId,
			Role = OrganizationRole.Admin,
			PermissionsFlags = (OrganizationPermissions)127,
			JoinedAt = DateTime.UtcNow
		});

		db.Set<ApplicationUser>().Add(new ApplicationUser
		{
			Id = applicationUserId,
			Email = $"admin-{applicationUserId:N}@test.com",
			UserName = $"admin-{applicationUserId:N}@test.com",
			DomainUserId = adminDomainUserId
		});

		await db.SaveChangesAsync();

		var configuration = new ConfigurationBuilder()
			.AddInMemoryCollection(new Dictionary<string, string?>
			{
				["Jwt:Key"] = "unit-test-jwt-key-with-sufficient-length-12345",
				["Jwt:Issuer"] = "prozoro-tests",
				["Jwt:Audience"] = "prozoro-tests",
				["Jwt:AccessTokenExpirationMinutes"] = "30",
				["Jwt:RefreshTokenExpirationDays"] = "7"
			})
			.Build();

		var fileStorage = new Mock<IFileStorage>();
		var logger = new Mock<ILogger<TokenService>>();

		var service = new TokenService(configuration, db, fileStorage.Object, new Mock<IAuthSessionStore>().Object, logger.Object);
		var tokenResponse = await service.GenerateTokensForUserAsync(applicationUserId, CancellationToken.None);

		var jwt = new JwtSecurityTokenHandler().ReadJwtToken(tokenResponse.AccessToken);
		var orgPermissionsClaim = jwt.Claims.Single(claim => claim.Type == "org_permissions").Value;
		var payload = JsonSerializer.Deserialize<Dictionary<string, int>>(orgPermissionsClaim);

		Assert.NotNull(payload);
		Assert.True(payload!.TryGetValue($"org_{organizationId:D}", out var adminMask));
		Assert.Equal((int)OrganizationPermissions.All, adminMask);
	}
}