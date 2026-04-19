using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Purchases.Queries.GetPublicPurchaseById;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Queries.GetPublicPurchaseById;

[Collection("PostgreSQL")]
public class GetPublicPurchaseByIdHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public GetPublicPurchaseByIdHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_ReturnsPurchase_WhenVisibleAndPublic()
	{
		await using var db = _fixture.CreateContext();

		var ownerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var purchaseId = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = ownerId, Email = "u@test.com", FirstName = "U", LastName = "T" });
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = $"org-{orgId}", OwnerUserId = ownerId });
		db.Campaigns.Add(new Campaign
		{
			Id = campaignId,
			OrganizationId = orgId,
			CreatedByUserId = ownerId,
			Title = "Campaign",
			Status = CampaignStatus.Active,
		});
		db.CampaignPurchases.Add(new CampaignPurchase
		{
			Id = purchaseId,
			OrganizationId = orgId,
			CampaignId = campaignId,
			CreatedByUserId = ownerId,
			Title = "Purchase",
			TotalAmount = 12500,
			Status = PurchaseStatus.PaymentSent,
		});
		db.CampaignDocuments.Add(new InvoiceDocument
		{
			Id = Guid.NewGuid(),
			PurchaseId = purchaseId,
			UploadedByUserId = ownerId,
			Type = DocumentType.Invoice,
			StorageKey = "invoice.pdf",
			OriginalFileName = "invoice.pdf",
		});

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(storageKey => $"https://cdn/{storageKey}");

		var handler = new GetPublicPurchaseByIdHandler(db, fileStorage.Object);
		var result = await handler.Handle(new GetPublicPurchaseByIdQuery(purchaseId), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal(purchaseId, result.Payload!.Id);
		Assert.Equal(campaignId, result.Payload.CampaignId);
		Assert.Single(result.Payload.Documents);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenPurchaseNotPublic()
	{
		await using var db = _fixture.CreateContext();

		var ownerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var purchaseId = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = ownerId, Email = "u2@test.com", FirstName = "U", LastName = "T" });
		db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = $"org-{orgId}", OwnerUserId = ownerId });
		db.Campaigns.Add(new Campaign
		{
			Id = campaignId,
			OrganizationId = orgId,
			CreatedByUserId = ownerId,
			Title = "Campaign",
			Status = CampaignStatus.Draft,
		});
		db.CampaignPurchases.Add(new CampaignPurchase
		{
			Id = purchaseId,
			OrganizationId = orgId,
			CampaignId = campaignId,
			CreatedByUserId = ownerId,
			Title = "Purchase",
			TotalAmount = 100,
			Status = PurchaseStatus.PaymentSent,
		});

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		var handler = new GetPublicPurchaseByIdHandler(db, fileStorage.Object);
		var result = await handler.Handle(new GetPublicPurchaseByIdQuery(purchaseId), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Equal("Витрату не знайдено", result.Message);
	}
}
