using Microsoft.EntityFrameworkCore;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.UpdateDocumentMetadata;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.UpdateDocumentMetadata;

[Collection("PostgreSQL")]
public class UpdateDocumentMetadataHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UpdateDocumentMetadataHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_WhenCampaignDoesNotBelongToOrganization_ReturnsFailure()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var authorizedOrgId = Guid.NewGuid();
		var foreignOrgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var purchaseId = Guid.NewGuid();
		var documentId = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = userId, Email = $"u-{userId:N}@t.com", FirstName = "F", LastName = "L" });
		db.Organizations.Add(new Organization { Id = authorizedOrgId, OwnerUserId = userId, Name = "Auth Org", Slug = $"auth-{authorizedOrgId:N}" });
		db.Organizations.Add(new Organization { Id = foreignOrgId, OwnerUserId = userId, Name = "Foreign Org", Slug = $"foreign-{foreignOrgId:N}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = foreignOrgId, CreatedByUserId = userId, Title = "Foreign Campaign", Description = "D" });
		db.CampaignPurchases.Add(new CampaignPurchase
		{
			Id = purchaseId,
			CampaignId = campaignId,
			CreatedByUserId = userId,
			Title = "Purchase",
			TotalAmount = 100,
			Status = PurchaseStatus.PaymentSent
		});
		db.CampaignDocuments.Add(new BankReceiptDocument
		{
			Id = documentId,
			PurchaseId = purchaseId,
			UploadedByUserId = userId,
			Type = DocumentType.Invoice,
			StorageKey = "doc.pdf",
			OriginalFileName = "doc.pdf",
			CounterpartyName = "Before"
		});
		await db.SaveChangesAsync();

		var fileStorageMock = new Mock<IFileStorage>();
		fileStorageMock.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns("https://cdn/doc.pdf");

		var orgAuthMock = new Mock<IOrganizationAuthorizationService>();
		orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(authorizedOrgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		var handler = new UpdateDocumentMetadataHandler(db, fileStorageMock.Object, orgAuthMock.Object);
		var command = new UpdateDocumentMetadataCommand(
			userId,
			authorizedOrgId,
			campaignId,
			purchaseId,
			documentId,
			200,
			"After",
			DateTime.UtcNow.Date);

		var result = await handler.Handle(command, CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Equal("Збір не знайдено в цій організації", result.Message);

		var document = await db.CampaignDocuments.IgnoreQueryFilters().SingleAsync(d => d.Id == documentId);
		Assert.Equal("Before", document.CounterpartyName);
	}
}
