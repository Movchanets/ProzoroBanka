using Moq;
using ProzoroBanka.Application.Campaigns.Commands.CreateCampaign;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Campaigns.Commands.CreateCampaign;

[Collection("PostgreSQL")]
public class CreateCampaignHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public CreateCampaignHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private static (Guid UserId, Guid OrgId) SeedData() => (Guid.NewGuid(), Guid.NewGuid());

	private async Task<(Guid UserId, Guid OrgId)> SeedUserAndOrgAsync(ApplicationDbContext db)
	{
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"user-{userId:N}@test.com",
			FirstName = "Test",
			LastName = "User"
		});
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Test Org",
			Slug = $"test-org-{orgId:N}",
			OwnerUserId = userId
		});
		await db.SaveChangesAsync();
		return (userId, orgId);
	}

	[Fact]
	public async Task Handle_CreatesCampaign_InDraftStatus()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId) = await SeedUserAndOrgAsync(db);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>()))
			.Returns<string>(key => $"https://storage.test/{key}");

		var handler = new CreateCampaignHandler(db, orgAuth.Object, fileStorage.Object);
		var result = await handler.Handle(
			new CreateCampaignCommand(userId, orgId, "Збір на допомогу", "Опис збору", 10000m, null),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal("Збір на допомогу", result.Payload.Title);
		Assert.Equal(CampaignStatus.Draft, result.Payload.Status);
		Assert.Equal(10000m, result.Payload.GoalAmount);
		Assert.Equal(0m, result.Payload.CurrentAmount);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenOrganizationNotFound()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var fakeOrgId = Guid.NewGuid();

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		var fileStorage = new Mock<IFileStorage>();

		var handler = new CreateCampaignHandler(db, orgAuth.Object, fileStorage.Object);
		var result = await handler.Handle(
			new CreateCampaignCommand(userId, fakeOrgId, "Test", null, 5000m, null),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("не знайдено", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenNoPermission()
	{
		await using var db = _fixture.CreateContext();
		var (userId, orgId) = await SeedUserAndOrgAsync(db);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.HasPermission(orgId, userId, OrganizationPermissions.ManageCampaigns, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		var fileStorage = new Mock<IFileStorage>();

		var handler = new CreateCampaignHandler(db, orgAuth.Object, fileStorage.Object);
		var result = await handler.Handle(
			new CreateCampaignCommand(userId, orgId, "Test", null, 5000m, null),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Недостатньо прав", result.Message);
	}
}
