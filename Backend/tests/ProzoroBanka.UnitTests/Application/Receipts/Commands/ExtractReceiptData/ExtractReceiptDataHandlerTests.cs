using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Receipts.Commands.ExtractReceiptData;

[Collection("PostgreSQL")]
public class ExtractReceiptDataHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public ExtractReceiptDataHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private static async Task<(Guid UserId, Guid ReceiptId)> SeedDraftReceiptAsync(ApplicationDbContext db)
	{
		var userId = Guid.NewGuid();
		var receiptId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"user-{userId:N}@test.com",
			FirstName = "Receipt",
			LastName = "User"
		});

		db.Receipts.Add(new Receipt
		{
			Id = receiptId,
			UserId = userId,
			StorageKey = "uploads/receipt.png",
			ReceiptImageStorageKey = "uploads/receipt.png",
			OriginalFileName = "receipt.png",
			Status = ReceiptStatus.PendingOcr,
			PublicationStatus = ReceiptPublicationStatus.Draft
		});

		await db.SaveChangesAsync();
		return (userId, receiptId);
	}

	[Fact]
	public async Task Handle_WhenExtractionSucceeds_UpdatesReceiptToOcrExtracted()
	{
		await using var db = _fixture.CreateContext();
		var (userId, receiptId) = await SeedDraftReceiptAsync(db);
		var orgId = Guid.NewGuid();

		var quota = new Mock<IOcrMonthlyQuotaService>();
		quota.Setup(q => q.TryConsumeAsync(orgId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new QuotaDecision(true, null));

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.IsMember(orgId, userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var extraction = new Mock<IReceiptStructuredExtractionService>();
		extraction
			.Setup(x => x.ExtractAsync(It.IsAny<Stream>(), "receipt.png", It.IsAny<CancellationToken>()))
			.ReturnsAsync(new ReceiptStructuredExtractionResult(
				true,
				"ATB",
				199.50m,
				DateTime.UtcNow.Date,
				"FN-123",
				null,
				"UAH",
				"Хліб",
				"{\"fiscalNumber\":\"FN-123\"}",
				"{\"merchant\":\"ATB\"}",
				null));

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new ExtractReceiptDataHandler(db, orgAuth.Object, extraction.Object, quota.Object, fileStorage.Object);
		await using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

		var result = await handler.Handle(new ExtractReceiptDataCommand(userId, receiptId, stream, "receipt.png", orgId), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal(ReceiptStatus.OcrExtracted, result.Payload.Status);

		var reloaded = await db.Receipts.FindAsync(receiptId);
		Assert.NotNull(reloaded);
		Assert.Equal("ATB", reloaded!.MerchantName);
		Assert.Equal("FN-123", reloaded.FiscalNumber);
		Assert.Equal(ReceiptStatus.OcrExtracted, reloaded.Status);
	}

	[Fact]
	public async Task Handle_WhenQuotaExceeded_SetsDeferredStatusAndReturnsFailure()
	{
		await using var db = _fixture.CreateContext();
		var (userId, receiptId) = await SeedDraftReceiptAsync(db);
		var orgId = Guid.NewGuid();

		var quota = new Mock<IOcrMonthlyQuotaService>();
		quota.Setup(q => q.TryConsumeAsync(orgId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new QuotaDecision(false, "Ліміт OCR вичерпано"));

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.IsMember(orgId, userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var extraction = new Mock<IReceiptStructuredExtractionService>();
		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);
		var handler = new ExtractReceiptDataHandler(db, orgAuth.Object, extraction.Object, quota.Object, fileStorage.Object);
		await using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

		var result = await handler.Handle(new ExtractReceiptDataCommand(userId, receiptId, stream, "receipt.png", orgId), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Ліміт OCR", result.Message);

		var reloaded = await db.Receipts.FindAsync(receiptId);
		Assert.NotNull(reloaded);
		Assert.Equal(ReceiptStatus.OcrDeferredMonthlyQuota, reloaded!.Status);
	}
}
