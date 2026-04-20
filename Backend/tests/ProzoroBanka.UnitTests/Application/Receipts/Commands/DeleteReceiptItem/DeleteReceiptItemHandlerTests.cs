using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItem;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Receipts.Commands.DeleteReceiptItem;

[Collection("PostgreSQL")]
public class DeleteReceiptItemHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public DeleteReceiptItemHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_WhenItemExists_SoftDeletesItemAndUnlinksPhotos()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var receiptId = Guid.NewGuid();
		var itemId = Guid.NewGuid();
		var photoId = Guid.NewGuid();

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
			Items =
			[
				new CampaignItem
				{
					Id = itemId,
					ReceiptId = receiptId,
					Name = "Item",
					SortOrder = 0,
				},
			],
			ItemPhotos =
			[
				new ReceiptItemPhoto
				{
					Id = photoId,
					ReceiptId = receiptId,
					StorageKey = "uploads/photo.png",
					OriginalFileName = "photo.png",
					SortOrder = 0,
					CampaignItemId = itemId,
				},
			],
		});

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);
		var orgAuth = new Mock<IOrganizationAuthorizationService>();

		var handler = new DeleteReceiptItemHandler(db, orgAuth.Object, fileStorage.Object);

		var result = await handler.Handle(
			new DeleteReceiptItemCommand(userId, receiptId, itemId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		var updatedItem = await db.CampaignItems.FindAsync(itemId);
		Assert.NotNull(updatedItem);
		Assert.True(updatedItem!.IsDeleted);

		var updatedPhoto = await db.ReceiptItemPhotos.FindAsync(photoId);
		Assert.NotNull(updatedPhoto);
		Assert.Null(updatedPhoto!.CampaignItemId);

		Assert.NotNull(result.Payload);
		Assert.Empty(result.Payload.Items ?? []);
	}
}
