using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Queries.GetPublicCampaignPurchases;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Queries.GetPublicCampaignPurchases;

[Collection("PostgreSQL")]
public class GetPublicCampaignPurchasesHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public GetPublicCampaignPurchasesHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_StripsFileUrlForTransferActAndExcludesCancelled()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var purchaseId = Guid.NewGuid();
		var cancelledId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = userId, Email = "u@t.com", FirstName = "F", LastName = "L" });
		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = userId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = userId, Title = "C", Description = "D" });

		db.CampaignPurchases.AddRange(
			new CampaignPurchase
			{
				Id = purchaseId,
				CampaignId = campaignId,
				CreatedByUserId = userId,
				Title = "Normal",
				TotalAmount = 100,
				Status = PurchaseStatus.PaymentSent
			},
			new CampaignPurchase
			{
				Id = cancelledId,
				CampaignId = campaignId,
				CreatedByUserId = userId,
				Title = "Cancelled",
				TotalAmount = 0,
				Status = PurchaseStatus.Cancelled
			}
		);

		db.CampaignDocuments.AddRange(
			new BankReceiptDocument
			{
				Id = Guid.NewGuid(),
				PurchaseId = purchaseId, // attached to normal purchase
				UploadedByUserId = userId,
				Type = DocumentType.TransferAct,
				StorageKey = "act.pdf",
				OriginalFileName = "act.pdf"
			},
			new BankReceiptDocument
			{
				Id = Guid.NewGuid(),
				PurchaseId = purchaseId, // attached to normal purchase
				UploadedByUserId = userId,
				Type = DocumentType.Invoice,
				StorageKey = "invoice.pdf",
				OriginalFileName = "invoice.pdf"
			}
		);

		await db.SaveChangesAsync();

		var fileStorageMock = new Mock<IFileStorage>();
		fileStorageMock.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => $"https://cdn/{key}");

		var handler = new GetPublicCampaignPurchasesHandler(db, fileStorageMock.Object);
		var query = new GetPublicCampaignPurchasesQuery(campaignId);

		// Act
		var result = await handler.Handle(query, CancellationToken.None);

		// Assert
		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		
		// Ensure cancelled is excluded
		Assert.Single(result.Payload);
		var purchase = result.Payload.First();
		Assert.Equal(purchaseId, purchase.Id);

		// Ensure TransferAct file URL is null, but Invoice is present
		Assert.Equal(2, purchase.Documents.Count);
		
		var transferAct = purchase.Documents.First(d => d.Type == DocumentType.TransferAct);
		Assert.Null(transferAct.FileUrl);

		var invoice = purchase.Documents.First(d => d.Type == DocumentType.Invoice);
		Assert.NotNull(invoice.FileUrl);
		Assert.Equal("https://cdn/invoice.pdf", invoice.FileUrl);
	}
}
