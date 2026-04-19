using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.UploadDocument;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.UploadDocument;

[Collection("PostgreSQL")]
public class UploadDocumentHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UploadDocumentHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_UploadsFileAndSetsOcrStatusToNotRequiredForTransferAct()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var purchaseId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"user-{userId:N}@test.com",
			FirstName = "Doc",
			LastName = "User"
		});

		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = userId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = userId, Title = "C", Description = "D" });

		db.CampaignPurchases.Add(new CampaignPurchase
		{
			Id = purchaseId,
			OrganizationId = orgId,
			CampaignId = campaignId,
			CreatedByUserId = userId,
			Title = "Test",
			TotalAmount = 100,
			Status = PurchaseStatus.PaymentSent
		});

		await db.SaveChangesAsync();

		var fileStorageMock = new Mock<IFileStorage>();
		fileStorageMock.Setup(x => x.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync("uploads/doc.pdf");
			
		fileStorageMock.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns("https://cdn/doc.pdf");

		var orgAuthMock = new Mock<IOrganizationAuthorizationService>();
		orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		var handler = new UploadDocumentHandler(db, fileStorageMock.Object, orgAuthMock.Object);

		using var stream = new MemoryStream("dummy data"u8.ToArray());
		var command = new UploadDocumentCommand(userId, orgId, campaignId, purchaseId, stream, "act.pdf", "application/pdf", DocumentType.TransferAct, DateTime.UtcNow, 100, "Army Unit");

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		
		// Ensure it didn't return a file URL for TransferAct in the mapper, but the entity itself should have processing status set correctly
		// Wait, the mapper for DocumentDto inside the command handler uses ToDocumentDto, not ToPublicDocumentDto! So FileUrl WILL be present in the dashboard.
		// Let's assert DB state primarily.
		var document = db.CampaignDocuments.FirstOrDefault(d => d.Id == result.Payload.Id);
		Assert.NotNull(document);
		Assert.Equal("uploads/doc.pdf", document.StorageKey);
		Assert.Equal(DocumentType.TransferAct, document.Type);
		Assert.Equal(OcrProcessingStatus.NotRequired, document.OcrProcessingStatus); // Security requirement
	}
	
	[Fact]
	public async Task Handle_UploadsFileAndSetsOcrStatusToNotProcessedForWaybill()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var purchaseId = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = userId, Email = $"user2-{userId:N}@test.com", FirstName = "U", LastName = "Ser" });
		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = userId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = userId, Title = "C", Description = "D" });
		db.CampaignPurchases.Add(new CampaignPurchase { Id = purchaseId, OrganizationId = orgId, CampaignId = campaignId, CreatedByUserId = userId, Title = "Test", TotalAmount = 100, Status = PurchaseStatus.PaymentSent });
		await db.SaveChangesAsync();

		var fileStorageMock = new Mock<IFileStorage>();
		fileStorageMock.Setup(x => x.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync("uploads/waybill.pdf");
		fileStorageMock.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns("https://cdn/doc.pdf");

		var orgAuthMock = new Mock<IOrganizationAuthorizationService>();
		orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		var handler = new UploadDocumentHandler(db, fileStorageMock.Object, orgAuthMock.Object);
		using var stream = new MemoryStream("dummy data"u8.ToArray());
		
		// Act
		var command = new UploadDocumentCommand(userId, orgId, campaignId, purchaseId, stream, "waybill.pdf", "application/pdf", DocumentType.Waybill, DateTime.UtcNow, 100, "Rozetka");
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		var document = db.CampaignDocuments.FirstOrDefault(d => d.Id == result.Payload!.Id);
		Assert.NotNull(document);
		Assert.Equal(OcrProcessingStatus.NotProcessed, document.OcrProcessingStatus);
	}
}
