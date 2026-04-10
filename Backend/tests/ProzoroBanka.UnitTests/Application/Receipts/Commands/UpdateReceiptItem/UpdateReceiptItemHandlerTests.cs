using ProzoroBanka.Application.Receipts.Commands.UpdateReceiptItem;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.UnitTests.Application.Receipts.Commands.UpdateReceiptItem;

[Collection("PostgreSQL")]
public class UpdateReceiptItemHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UpdateReceiptItemHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_WhenItemExists_UpdatesItemFields()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();
		var receiptId = Guid.NewGuid();
		var itemId = Guid.NewGuid();

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
				new ReceiptItem
				{
					Id = itemId,
					ReceiptId = receiptId,
					Name = "Old item",
					Quantity = 1,
					UnitPrice = 100,
					TotalPrice = 100,
					SortOrder = 0,
				},
			],
		});

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new UpdateReceiptItemHandler(db, fileStorage.Object);

		var result = await handler.Handle(
			new UpdateReceiptItemCommand(
				userId,
				receiptId,
				itemId,
				"Updated item",
				2,
				2699,
				5398,
				"4823096005591",
				20,
				540),
				CancellationToken.None);

		Assert.True(result.IsSuccess);
		var updatedItem = await db.ReceiptItems.FindAsync(itemId);
		Assert.NotNull(updatedItem);
		Assert.Equal("Updated item", updatedItem!.Name);
		Assert.Equal(2, updatedItem.Quantity);
		Assert.Equal(2699, updatedItem.UnitPrice);
		Assert.Equal(5398, updatedItem.TotalPrice);
		Assert.Equal("4823096005591", updatedItem.Barcode);
		Assert.Equal(20, updatedItem.VatRate);
		Assert.Equal(540, updatedItem.VatAmount);
		Assert.NotNull(result.Payload);
		Assert.Equal("Updated item", result.Payload.Items!.Single().Name);
	}
}