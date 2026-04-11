using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.Commands.UpdateReceiptOcrDraft;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Receipts.Commands.UpdateReceiptOcrDraft;

[Collection("PostgreSQL")]
public class UpdateReceiptOcrDraftHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UpdateReceiptOcrDraftHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_WhenPurchaseDateIsUnspecified_NormalizesToUtcKind()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var receiptId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"user-{userId:N}@test.com",
			FirstName = "Receipt",
			LastName = "User",
		});

		db.Receipts.Add(new Receipt
		{
			Id = receiptId,
			UserId = userId,
			StorageKey = "uploads/receipt.png",
			ReceiptImageStorageKey = "uploads/receipt.png",
			OriginalFileName = "receipt.png",
			Status = ReceiptStatus.OcrExtracted,
			PublicationStatus = ReceiptPublicationStatus.Draft,
		});

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);
		var orgAuth = new Mock<IOrganizationAuthorizationService>();

		var handler = new UpdateReceiptOcrDraftHandler(db, orgAuth.Object, fileStorage.Object);
		var unspecifiedDate = DateTime.SpecifyKind(new DateTime(2026, 4, 9, 16, 21, 15), DateTimeKind.Unspecified);

		var result = await handler.Handle(
			new UpdateReceiptOcrDraftCommand(
				userId,
				receiptId,
				"alias",
				"Store",
				34040,
				unspecifiedDate,
				"3000751015",
				"23070113",
				"UAH",
				null,
				"{}"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		var updated = await db.Receipts.FindAsync(receiptId);
		Assert.NotNull(updated);
		Assert.Equal(DateTimeKind.Utc, updated!.PurchaseDateUtc!.Value.Kind);
		Assert.Equal(DateTimeKind.Utc, updated.TransactionDate!.Value.Kind);
	}

	[Fact]
	public async Task Handle_WhenReceiptOwnedByAnotherUserButCallerIsOrganizationMember_AllowsUpdate()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var callerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var receiptId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User
			{
				Id = ownerId,
				Email = $"owner-{ownerId:N}@test.com",
				FirstName = "Owner",
				LastName = "User",
			},
			new User
			{
				Id = callerId,
				Email = $"caller-{callerId:N}@test.com",
				FirstName = "Caller",
				LastName = "User",
			});

		db.Receipts.Add(new Receipt
		{
			Id = receiptId,
			UserId = ownerId,
			OrganizationId = orgId,
			StorageKey = "uploads/receipt.png",
			ReceiptImageStorageKey = "uploads/receipt.png",
			OriginalFileName = "receipt.png",
			Status = ReceiptStatus.OcrExtracted,
			PublicationStatus = ReceiptPublicationStatus.Draft,
		});

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = $"Org-{orgId:N}",
			Slug = $"org-{orgId:N}",
			OwnerUserId = ownerId,
		});

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth
			.Setup(x => x.IsMember(orgId, callerId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var handler = new UpdateReceiptOcrDraftHandler(db, orgAuth.Object, fileStorage.Object);

		var result = await handler.Handle(
			new UpdateReceiptOcrDraftCommand(
				callerId,
				receiptId,
				"alias",
				"Store",
				34040,
				DateTime.SpecifyKind(new DateTime(2026, 4, 9, 16, 21, 15), DateTimeKind.Unspecified),
				"3000751015",
				"23070113",
				"UAH",
				null,
				"{}"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		orgAuth.Verify(x => x.IsMember(orgId, callerId, It.IsAny<CancellationToken>()), Times.Once);
	}
}
