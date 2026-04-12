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

	private static async Task<(Guid OwnerUserId, Guid MemberUserId, Guid ReceiptId, Guid OrganizationId)> SeedOrganizationDraftReceiptAsync(ApplicationDbContext db)
	{
		var ownerUserId = Guid.NewGuid();
		var memberUserId = Guid.NewGuid();
		var receiptId = Guid.NewGuid();
		var organizationId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User
			{
				Id = ownerUserId,
				Email = $"owner-{ownerUserId:N}@test.com",
				FirstName = "Receipt",
				LastName = "Owner"
			},
			new User
			{
				Id = memberUserId,
				Email = $"member-{memberUserId:N}@test.com",
				FirstName = "Receipt",
				LastName = "Member"
			});

		db.Organizations.Add(new Organization
		{
			Id = organizationId,
			OwnerUserId = ownerUserId,
			Name = "Test Organization"
		});

		db.OrganizationMembers.Add(new OrganizationMember
		{
			OrganizationId = organizationId,
			UserId = memberUserId,
			Role = OrganizationRole.Reporter
		});

		db.Receipts.Add(new Receipt
		{
			Id = receiptId,
			UserId = ownerUserId,
			OrganizationId = organizationId,
			StorageKey = "uploads/org-receipt.png",
			ReceiptImageStorageKey = "uploads/org-receipt.png",
			OriginalFileName = "org-receipt.png",
			Status = ReceiptStatus.PendingOcr,
			PublicationStatus = ReceiptPublicationStatus.Draft
		});

		await db.SaveChangesAsync();
		return (ownerUserId, memberUserId, receiptId, organizationId);
	}

	[Fact]
	public async Task Handle_WhenQuotaAllowed_SetsStatusToPendingOcrAndEnqueues()
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

		var ocrQueue = new Mock<IOcrProcessingQueue>();
		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new ExtractReceiptDataHandler(db, orgAuth.Object, quota.Object, ocrQueue.Object, fileStorage.Object);
		await using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

		var result = await handler.Handle(new ExtractReceiptDataCommand(userId, receiptId, stream, "receipt.png", orgId), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal(ReceiptStatus.PendingOcr, result.Payload.Status);

		ocrQueue.Verify(q => q.EnqueueAsync(
			It.Is<OcrWorkItem>(item => item.ReceiptId == receiptId && item.OrganizationId == orgId),
			It.IsAny<CancellationToken>()), Times.Once);
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

		var ocrQueue = new Mock<IOcrProcessingQueue>();
		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);
		var handler = new ExtractReceiptDataHandler(db, orgAuth.Object, quota.Object, ocrQueue.Object, fileStorage.Object);
		await using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

		var result = await handler.Handle(new ExtractReceiptDataCommand(userId, receiptId, stream, "receipt.png", orgId), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("Ліміт OCR", result.Message);

		var reloaded = await db.Receipts.FindAsync(receiptId);
		Assert.NotNull(reloaded);
		Assert.Equal(ReceiptStatus.OcrDeferredMonthlyQuota, reloaded!.Status);

		ocrQueue.Verify(q => q.EnqueueAsync(It.IsAny<OcrWorkItem>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	public async Task Handle_WhenNoFileProvided_EnqueuesWithExistingStorageKey()
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

		var ocrQueue = new Mock<IOcrProcessingQueue>();
		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new ExtractReceiptDataHandler(db, orgAuth.Object, quota.Object, ocrQueue.Object, fileStorage.Object);

		var result = await handler.Handle(
			new ExtractReceiptDataCommand(userId, receiptId, null, null, orgId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(ReceiptStatus.PendingOcr, result.Payload!.Status);

		// File upload should not be called when no file is provided
		fileStorage.Verify(x => x.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

		// But OCR should still be enqueued since receipt has existing ReceiptImageStorageKey
		ocrQueue.Verify(q => q.EnqueueAsync(
			It.Is<OcrWorkItem>(item => item.ReceiptId == receiptId),
			It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	public async Task Handle_WhenReceiptOwnedByAnotherUserInSameOrganization_AllowsExtraction()
	{
		await using var db = _fixture.CreateContext();
		var (ownerUserId, memberUserId, receiptId, orgId) = await SeedOrganizationDraftReceiptAsync(db);

		var quota = new Mock<IOcrMonthlyQuotaService>();
		quota.Setup(q => q.TryConsumeAsync(orgId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new QuotaDecision(true, null));

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.IsMember(orgId, memberUserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var ocrQueue = new Mock<IOcrProcessingQueue>();
		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new ExtractReceiptDataHandler(db, orgAuth.Object, quota.Object, ocrQueue.Object, fileStorage.Object);

		var result = await handler.Handle(
			new ExtractReceiptDataCommand(memberUserId, receiptId, null, null, orgId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(ReceiptStatus.PendingOcr, result.Payload!.Status);

		ocrQueue.Verify(q => q.EnqueueAsync(
			It.Is<OcrWorkItem>(item => item.ReceiptId == receiptId
				&& item.OrganizationId == orgId
				&& item.CallerUserId == ownerUserId),
			It.IsAny<CancellationToken>()), Times.Once);
	}
}
