using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.CreatePurchase;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.CreatePurchase;

[Collection("PostgreSQL")]
public class CreatePurchaseHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public CreatePurchaseHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_WithValidRequest_CreatesPurchaseAndReturnsSuccess()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();

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
			Name = $"Org-{orgId:N}",
			Slug = $"org-{orgId:N}",
			OwnerUserId = userId
		});

		db.Campaigns.Add(new Campaign
		{
			Id = campaignId,
			OrganizationId = orgId,
			CreatedByUserId = userId,
			Title = "Test Campaign",
			Description = "Desc",
			GoalAmount = 100000
		});

		await db.SaveChangesAsync();

		var fileStorageMock = new Mock<IFileStorage>();
		var orgAuthMock = new Mock<IOrganizationAuthorizationService>();

		orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(
				orgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!)); // Payload not strictly needed for this mock

		var command = new CreatePurchaseCommand(userId, orgId, campaignId, "Drones", 15000);
		var handler = new CreatePurchaseHandler(db, fileStorageMock.Object, orgAuthMock.Object);

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal("Drones", result.Payload.Title);
		Assert.Equal(15000, result.Payload.TotalAmount);
		Assert.Equal(PurchaseStatus.PaymentSent, result.Payload.Status);

		var savedPurchase = db.CampaignPurchases.FirstOrDefault(p => p.Id == result.Payload.Id);
		Assert.NotNull(savedPurchase);
		Assert.Equal(campaignId, savedPurchase.CampaignId);
		Assert.Equal(userId, savedPurchase.CreatedByUserId);
	}

	[Fact]
	public async Task Handle_WhenOrganizationAccessFails_ReturnsFailure()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var fileStorageMock = new Mock<IFileStorage>();
		var orgAuthMock = new Mock<IOrganizationAuthorizationService>();

		orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(
				It.IsAny<Guid>(), It.IsAny<Guid>(), OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Failure("Access Denied"));

		var command = new CreatePurchaseCommand(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Drones", 15000);
		var handler = new CreatePurchaseHandler(db, fileStorageMock.Object, orgAuthMock.Object);

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.False(result.IsSuccess);
		Assert.Equal("Access Denied", result.Message);
	}
}
