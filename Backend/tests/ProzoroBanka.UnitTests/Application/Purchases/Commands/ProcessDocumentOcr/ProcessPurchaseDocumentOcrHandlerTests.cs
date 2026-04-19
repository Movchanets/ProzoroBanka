using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.ProcessDocumentOcr;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;
using Xunit;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.ProcessDocumentOcr;

[Collection("PostgreSQL")]
public class ProcessPurchaseDocumentOcrHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;
	private readonly Mock<IFileStorage> _fileStorageMock;
	private readonly Mock<IOrganizationAuthorizationService> _orgAuthMock;

	public ProcessPurchaseDocumentOcrHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
		_fileStorageMock = new Mock<IFileStorage>();
		_orgAuthMock = new Mock<IOrganizationAuthorizationService>();
		_fileStorageMock.Setup(x => x.GetPublicUrl(It.IsAny<string>()))
			.Returns((string key) => $"https://test.com/{key}");
	}

	[Fact]
	public async Task Handle_Success_UpdatesDocumentMetadata()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var callerId = Guid.NewGuid();
		var purchase = new CampaignPurchase
		{
			Id = Guid.NewGuid(),
			CampaignId = campaignId,
			CreatedByUserId = callerId,
			Title = "Test",
			TotalAmount = 1000
		};
		var document = new BankReceiptDocument
		{
			Id = Guid.NewGuid(),
			PurchaseId = purchase.Id,
			UploadedByUserId = callerId,
			Type = DocumentType.Waybill,
			StorageKey = "test.jpg",
			OriginalFileName = "test.jpg",
			OcrProcessingStatus = OcrProcessingStatus.NotProcessed
		};

		db.DomainUsers.Add(new User { Id = callerId, Email = $"u-{callerId:N}@t.com", FirstName = "F", LastName = "L" });
		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = callerId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = callerId, Title = "C", Description = "D" });
		db.CampaignPurchases.Add(purchase);
		db.CampaignDocuments.Add(document);
		await db.SaveChangesAsync();

		_orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, callerId, OrganizationPermissions.ManagePurchases, null, default))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		var stubStream = new MemoryStream(new byte[] { 1, 2, 3 });
		_fileStorageMock.Setup(x => x.OpenReadAsync(document.StorageKey, default))
			.ReturnsAsync(stubStream);

		var ocrDate = new DateTime(2025, 1, 2, 0, 0, 0, DateTimeKind.Utc);
		var ocrStub = new StubDocumentOcrService(new DocumentOcrResult(true, "Rozetka", ocrDate, 500.50m, [], "{}", null));

		var command = new ProcessPurchaseDocumentOcrCommand(orgId, campaignId, purchase.Id, document.Id, callerId);
		var handler = new ProcessPurchaseDocumentOcrHandler(db, _fileStorageMock.Object, _orgAuthMock.Object, ocrStub);

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.True(result.IsSuccess);
		Assert.Equal(OcrProcessingStatus.Success, result.Payload!.OcrProcessingStatus);
		Assert.Equal("Rozetka", result.Payload.CounterpartyName);
		Assert.Equal(50050, result.Payload.Amount);
		Assert.Equal(ocrDate, result.Payload.DocumentDate);
		Assert.Single(ocrStub.Calls);
	}

	[Fact]
	public async Task Handle_TransferAct_FailsSecurityCheck()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var callerId = Guid.NewGuid();
		var purchase = new CampaignPurchase
		{
			Id = Guid.NewGuid(),
			CampaignId = campaignId,
			CreatedByUserId = callerId,
			Title = "Test Security",
			TotalAmount = 2000
		};
		var document = new BankReceiptDocument
		{
			Id = Guid.NewGuid(),
			PurchaseId = purchase.Id,
			UploadedByUserId = callerId,
			Type = DocumentType.TransferAct, // Strict constraint
			StorageKey = "act.pdf",
			OriginalFileName = "act.pdf",
			OcrProcessingStatus = OcrProcessingStatus.NotRequired
		};

		db.DomainUsers.Add(new User { Id = callerId, Email = $"u-{callerId:N}@t.com", FirstName = "F", LastName = "L" });
		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = callerId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = callerId, Title = "C", Description = "D" });
		db.CampaignPurchases.Add(purchase);
		db.CampaignDocuments.Add(document);
		await db.SaveChangesAsync();

		_orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, callerId, OrganizationPermissions.ManagePurchases, null, default))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		var ocrStub = new StubDocumentOcrService();
		var command = new ProcessPurchaseDocumentOcrCommand(orgId, campaignId, purchase.Id, document.Id, callerId);
		var handler = new ProcessPurchaseDocumentOcrHandler(db, _fileStorageMock.Object, _orgAuthMock.Object, ocrStub);

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.False(result.IsSuccess);
		Assert.Contains("Актів прийому-передачі", result.Message);
		
		// Ensure OCR is never called
		Assert.Empty(ocrStub.Calls);
	}

	private sealed class StubDocumentOcrService : IDocumentOcrService
	{
		private readonly DocumentOcrResult _result;

		public StubDocumentOcrService(DocumentOcrResult? result = null)
		{
			_result = result ?? new DocumentOcrResult(false, null, null, null, [], null, null);
		}

		public List<(string FileName, DocumentType Type)> Calls { get; } = new();

		public Task<DocumentOcrResult> ParseDocumentAsync(Stream imageStream, string fileName, DocumentType type, string? modelIdentifier = null, CancellationToken ct = default)
		{
			Calls.Add((fileName, type));
			return Task.FromResult(_result);
		}
	}
}
