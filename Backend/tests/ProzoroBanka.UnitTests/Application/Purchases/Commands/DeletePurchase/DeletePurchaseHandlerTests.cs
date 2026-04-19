using Moq;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.DeletePurchase;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.DeletePurchase;

[Collection("PostgreSQL")]
public class DeletePurchaseHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public DeletePurchaseHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_SoftDeletesPurchaseCascadesToDocumentsAndDeletesFiles()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var purchaseId = Guid.NewGuid();
		var docId1 = Guid.NewGuid();
		var docId2 = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = userId, Email = "u@t.com", FirstName = "F", LastName = "L" });
		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = userId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = userId, Title = "C", Description = "D" });

		db.CampaignPurchases.Add(new CampaignPurchase
		{
			Id = purchaseId,
			OrganizationId = orgId,
			CampaignId = campaignId,
			CreatedByUserId = userId,
			Title = "DelTest",
			TotalAmount = 100,
			Status = PurchaseStatus.PaymentSent,
			IsDeleted = false
		});

		db.CampaignDocuments.Add(new BankReceiptDocument
		{
			Id = docId1,
			PurchaseId = purchaseId,
			UploadedByUserId = userId,
			StorageKey = "del-1.pdf",
			OriginalFileName = "1.pdf",
			Type = DocumentType.Invoice,
			IsDeleted = false
		});
		
		db.CampaignDocuments.Add(new BankReceiptDocument
		{
			Id = docId2,
			PurchaseId = purchaseId,
			UploadedByUserId = userId,
			StorageKey = "del-2.pdf",
			OriginalFileName = "2.pdf",
			Type = DocumentType.BankReceipt,
			IsDeleted = true // Already deleted, should be skipped
		});

		await db.SaveChangesAsync();

		var fileStorageMock = new Mock<IFileStorage>();
		fileStorageMock.Setup(x => x.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		var orgAuthMock = new Mock<IOrganizationAuthorizationService>();
		orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		var handler = new DeletePurchaseHandler(db, fileStorageMock.Object, orgAuthMock.Object);
		var command = new DeletePurchaseCommand(userId, orgId, campaignId, purchaseId);

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.True(result.IsSuccess);
		
		// Recheck DB
		var dbPurchaseQuery = db.CampaignPurchases.IgnoreQueryFilters().FirstOrDefault(p => p.Id == purchaseId);
		Assert.NotNull(dbPurchaseQuery);
		Assert.True(dbPurchaseQuery.IsDeleted);

		var doc1 = db.CampaignDocuments.IgnoreQueryFilters().FirstOrDefault(d => d.Id == docId1);
		Assert.NotNull(doc1);
		Assert.True(doc1.IsDeleted);

		// Ensure file was deleted exactly once for doc1, and 0 for doc2
		fileStorageMock.Verify(x => x.DeleteAsync("del-1.pdf", It.IsAny<CancellationToken>()), Times.Once);
		fileStorageMock.Verify(x => x.DeleteAsync("del-2.pdf", It.IsAny<CancellationToken>()), Times.Never);
	}
}
