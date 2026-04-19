using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Common;
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
	private readonly Mock<IOcrMonthlyQuotaService> _ocrQuotaServiceMock;

	public ProcessPurchaseDocumentOcrHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
		_fileStorageMock = new Mock<IFileStorage>();
		_orgAuthMock = new Mock<IOrganizationAuthorizationService>();
		_ocrQuotaServiceMock = new Mock<IOcrMonthlyQuotaService>();
		_fileStorageMock.Setup(x => x.GetPublicUrl(It.IsAny<string>()))
			.Returns((string key) => $"https://test.com/{key}");
		_ocrQuotaServiceMock
			.Setup(x => x.TryConsumeAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new QuotaDecision(true, null));
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
			OrganizationId = orgId,
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
			Type = DocumentType.BankReceipt,
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
		var ocrStub = new StubDocumentOcrService(new DocumentOcrResult(
			Success: true,
			CounterpartyName: "Rozetka",
			DocumentDate: ocrDate,
			TotalAmount: 500.50m,
			Items: [],
			RawJson: "{}",
			ErrorMessage: null,
			Edrpou: "12345678",
			PayerFullName: "Іваненко Іван Іванович",
			ReceiptCode: "RCP-2026-001",
			PaymentPurpose: "Оплата за товари",
			SenderIban: "UA111111111111111111111111111",
			ReceiverIban: "UA222222222222222222222222222"));
		var ocrDispatcher = new PurchaseDocumentOcrDispatcher(db);

		var command = new ProcessPurchaseDocumentOcrCommand(orgId, campaignId, purchase.Id, document.Id, callerId);
		var handler = new ProcessPurchaseDocumentOcrHandler(db, _fileStorageMock.Object, _orgAuthMock.Object, _ocrQuotaServiceMock.Object, ocrStub, ocrDispatcher);

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.True(result.IsSuccess);
		Assert.Equal(OcrProcessingStatus.Success, result.Payload!.OcrProcessingStatus);
		Assert.Equal("Rozetka", result.Payload.CounterpartyName);
		Assert.Equal(50050, result.Payload.Amount);
		Assert.Equal(ocrDate, result.Payload.DocumentDate);
		Assert.Equal("12345678", result.Payload.Edrpou);
		Assert.Equal("Іваненко Іван Іванович", result.Payload.PayerFullName);
		Assert.Equal("RCP-2026-001", result.Payload.ReceiptCode);
		Assert.Equal("Оплата за товари", result.Payload.PaymentPurpose);
		Assert.Equal("UA111111111111111111111111111", result.Payload.SenderIban);
		Assert.Equal("UA222222222222222222222222222", result.Payload.ReceiverIban);
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
			OrganizationId = orgId,
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
		var ocrDispatcher = new PurchaseDocumentOcrDispatcher(db);
		var command = new ProcessPurchaseDocumentOcrCommand(orgId, campaignId, purchase.Id, document.Id, callerId);
		var handler = new ProcessPurchaseDocumentOcrHandler(db, _fileStorageMock.Object, _orgAuthMock.Object, _ocrQuotaServiceMock.Object, ocrStub, ocrDispatcher);

		// Act
		var result = await handler.Handle(command, CancellationToken.None);

		// Assert
		Assert.False(result.IsSuccess);
		Assert.Contains("Актів прийому-передачі", result.Message);
		
		// Ensure OCR is never called
		Assert.Empty(ocrStub.Calls);
	}

	[Fact]
	public async Task Handle_WaybillOcr_MapsParsedItemsToDocument()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var callerId = Guid.NewGuid();

		var purchase = new CampaignPurchase
		{
			Id = Guid.NewGuid(),
			OrganizationId = orgId,
			CampaignId = campaignId,
			CreatedByUserId = callerId,
			Title = "Waybill OCR",
			TotalAmount = 1000
		};

		var document = new WaybillDocument
		{
			Id = Guid.NewGuid(),
			PurchaseId = purchase.Id,
			UploadedByUserId = callerId,
			Type = DocumentType.Waybill,
			StorageKey = "waybill.png",
			OriginalFileName = "waybill.png",
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

		var ocrItems = new List<OcrParsedItem>
		{
			new("Кеди Nike Court Vision", 1, 2545m, 2545m),
			new("Доставка", 1, 90m, 90m),
		};
		var ocrStub = new StubDocumentOcrService(new DocumentOcrResult(true, "ФОП. Шевченко П.О.", new DateTime(2026, 2, 3, 0, 0, 0, DateTimeKind.Utc), 2635m, ocrItems, "{}", null));
		var ocrDispatcher = new PurchaseDocumentOcrDispatcher(db);

		var command = new ProcessPurchaseDocumentOcrCommand(orgId, campaignId, purchase.Id, document.Id, callerId);
		var handler = new ProcessPurchaseDocumentOcrHandler(db, _fileStorageMock.Object, _orgAuthMock.Object, _ocrQuotaServiceMock.Object, ocrStub, ocrDispatcher);

		var result = await handler.Handle(command, CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(OcrProcessingStatus.Success, result.Payload!.OcrProcessingStatus);
		Assert.NotNull(result.Payload.Items);
		Assert.Equal(2, result.Payload.Items!.Count);
		Assert.Contains(result.Payload.Items, x => x.Name == "Кеди Nike Court Vision" && x.UnitPrice == 254500 && x.TotalPrice == 254500);
		Assert.Contains(result.Payload.Items, x => x.Name == "Доставка" && x.UnitPrice == 9000 && x.TotalPrice == 9000);
	}

	[Fact]
	public async Task Handle_AlreadyProcessed_RequiresConfirmation()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var callerId = Guid.NewGuid();

		var purchase = new CampaignPurchase
		{
			Id = Guid.NewGuid(),
			OrganizationId = orgId,
			CampaignId = campaignId,
			CreatedByUserId = callerId,
			Title = "Processed",
			TotalAmount = 1000
		};

		var document = new BankReceiptDocument
		{
			Id = Guid.NewGuid(),
			PurchaseId = purchase.Id,
			UploadedByUserId = callerId,
			Type = DocumentType.BankReceipt,
			StorageKey = "processed.jpg",
			OriginalFileName = "processed.jpg",
			OcrProcessingStatus = OcrProcessingStatus.Success
		};

		db.DomainUsers.Add(new User { Id = callerId, Email = $"u-{callerId:N}@t.com", FirstName = "F", LastName = "L" });
		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = callerId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = callerId, Title = "C", Description = "D" });
		db.CampaignPurchases.Add(purchase);
		db.CampaignDocuments.Add(document);
		await db.SaveChangesAsync();

		_orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, callerId, OrganizationPermissions.ManagePurchases, null, default))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		var ocrStub = new StubDocumentOcrService(new DocumentOcrResult(true, "C", DateTime.UtcNow, 1m, [], "{}", null));
		var ocrDispatcher = new PurchaseDocumentOcrDispatcher(db);
		var command = new ProcessPurchaseDocumentOcrCommand(orgId, campaignId, purchase.Id, document.Id, callerId);
		var handler = new ProcessPurchaseDocumentOcrHandler(db, _fileStorageMock.Object, _orgAuthMock.Object, _ocrQuotaServiceMock.Object, ocrStub, ocrDispatcher);

		var result = await handler.Handle(command, CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Підтвердіть повторне розпізнавання", result.Message);
		Assert.Empty(ocrStub.Calls);
	}

	[Fact]
	public async Task Handle_AlreadyProcessed_WithConfirmation_AllowsReprocess()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();
		var callerId = Guid.NewGuid();

		var purchase = new CampaignPurchase
		{
			Id = Guid.NewGuid(),
			OrganizationId = orgId,
			CampaignId = campaignId,
			CreatedByUserId = callerId,
			Title = "Reprocess",
			TotalAmount = 1000
		};

		var document = new BankReceiptDocument
		{
			Id = Guid.NewGuid(),
			PurchaseId = purchase.Id,
			UploadedByUserId = callerId,
			Type = DocumentType.BankReceipt,
			StorageKey = "reprocess.jpg",
			OriginalFileName = "reprocess.jpg",
			OcrProcessingStatus = OcrProcessingStatus.Success
		};

		db.DomainUsers.Add(new User { Id = callerId, Email = $"u-{callerId:N}@t.com", FirstName = "F", LastName = "L" });
		db.Organizations.Add(new Organization { Id = orgId, OwnerUserId = callerId, Name = "Org", Slug = $"org-{orgId}" });
		db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = callerId, Title = "C", Description = "D" });
		db.CampaignPurchases.Add(purchase);
		db.CampaignDocuments.Add(document);
		await db.SaveChangesAsync();

		_orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, callerId, OrganizationPermissions.ManagePurchases, null, default))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

		_fileStorageMock.Setup(x => x.OpenReadAsync(document.StorageKey, default))
			.ReturnsAsync(new MemoryStream(new byte[] { 1, 2, 3 }));

		var ocrStub = new StubDocumentOcrService(new DocumentOcrResult(true, "Updated", DateTime.UtcNow, 123m, [], "{}", null));
		var ocrDispatcher = new PurchaseDocumentOcrDispatcher(db);
		var command = new ProcessPurchaseDocumentOcrCommand(orgId, campaignId, purchase.Id, document.Id, callerId, ConfirmReprocess: true);
		var handler = new ProcessPurchaseDocumentOcrHandler(db, _fileStorageMock.Object, _orgAuthMock.Object, _ocrQuotaServiceMock.Object, ocrStub, ocrDispatcher);

		var result = await handler.Handle(command, CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Single(ocrStub.Calls);
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
