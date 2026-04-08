using Microsoft.EntityFrameworkCore;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Services.Receipts;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Receipts;

[Collection("PostgreSQL")]
public class OrganizationPlanOcrMonthlyQuotaServiceTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public OrganizationPlanOcrMonthlyQuotaServiceTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task TryConsumeAsync_WhenUsageBelowLimit_ReturnsAllowed()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var now = DateTime.UtcNow;

		db.DomainUsers.Add(new User { Id = userId, Email = $"u-{userId:N}@test.com", FirstName = "U", LastName = "1" });
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = $"org-{orgId:N}", OwnerUserId = userId, PlanType = OrganizationPlanType.Free });
		db.OrganizationMembers.Add(new OrganizationMember { OrganizationId = orgId, UserId = userId, Role = OrganizationRole.Owner, PermissionsFlags = OrganizationPermissions.All, JoinedAt = now.AddDays(-10) });
		await db.SaveChangesAsync();

		var settings = new Mock<ISystemSettingsService>();
		settings.Setup(s => s.GetPlanLimitsAsync(OrganizationPlanType.Free, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new OrganizationPlanLimits { MaxCampaigns = 3, MaxMembers = 10, MaxOcrExtractionsPerMonth = 2 });

		var sut = new OrganizationPlanOcrMonthlyQuotaService(db, settings.Object);
		var decision = await sut.TryConsumeAsync(orgId, now, CancellationToken.None);

		Assert.True(decision.Allowed);
	}

	[Fact]
	public async Task TryConsumeAsync_WhenUsageReachedLimit_ReturnsDenied()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var userId = Guid.NewGuid();
		var now = DateTime.UtcNow;

		db.DomainUsers.Add(new User { Id = userId, Email = $"u-{userId:N}@test.com", FirstName = "U", LastName = "2" });
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org2", Slug = $"org2-{orgId:N}", OwnerUserId = userId, PlanType = OrganizationPlanType.Free });
		db.OrganizationMembers.Add(new OrganizationMember { OrganizationId = orgId, UserId = userId, Role = OrganizationRole.Owner, PermissionsFlags = OrganizationPermissions.All, JoinedAt = now.AddDays(-10) });
		db.Receipts.Add(new Receipt
		{
			Id = Guid.NewGuid(),
			UserId = userId,
			StorageKey = "r1.png",
			OriginalFileName = "r1.png",
			Status = ReceiptStatus.OcrExtracted,
			PublicationStatus = ReceiptPublicationStatus.Draft,
			OcrExtractedAtUtc = now
		});
		await db.SaveChangesAsync();

		var settings = new Mock<ISystemSettingsService>();
		settings.Setup(s => s.GetPlanLimitsAsync(OrganizationPlanType.Free, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new OrganizationPlanLimits { MaxCampaigns = 3, MaxMembers = 10, MaxOcrExtractionsPerMonth = 1 });

		var sut = new OrganizationPlanOcrMonthlyQuotaService(db, settings.Object);
		var decision = await sut.TryConsumeAsync(orgId, now, CancellationToken.None);

		Assert.False(decision.Allowed);
		Assert.Contains("ліміт OCR", decision.Reason, StringComparison.OrdinalIgnoreCase);
	}
}
