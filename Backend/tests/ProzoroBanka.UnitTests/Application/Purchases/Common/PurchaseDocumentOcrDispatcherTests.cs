using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Purchases.Common;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;
using Xunit;

namespace ProzoroBanka.UnitTests.Application.Purchases.Common;

[Collection("PostgreSQL")]
public class PurchaseDocumentOcrDispatcherTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public PurchaseDocumentOcrDispatcherTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task ApplyAsync_ShouldMapBankReceiptFields_WhenDocumentIsBankReceipt()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var sut = new PurchaseDocumentOcrDispatcher(db);
		
		var document = new BankReceiptDocument
		{
			Id = Guid.NewGuid(),
			Purchase = new CampaignPurchase { Id = Guid.NewGuid(), CampaignId = Guid.NewGuid(), Title = "P" }
		};

		var ocrResult = new DocumentOcrResult(
			true,
			"Test Counterparty",
			new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
			100.50m,
			Array.Empty<OcrParsedItem>(),
			"{}",
			null)
		{
			Edrpou = "12345678",
			PayerFullName = "Payer Name",
			ReceiptCode = "CODE123",
			PaymentPurpose = "Purpose",
			SenderIban = "IBAN1",
			ReceiverIban = "IBAN2"
		};

		// Act
		await sut.ApplyAsync(document, ocrResult, CancellationToken.None);

		// Assert
		Assert.Equal("Test Counterparty", document.CounterpartyName);
		Assert.Equal(10050, document.Amount);
		Assert.Equal(new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc), document.DocumentDate);
		Assert.Equal("12345678", document.Edrpou);
		Assert.Equal("Payer Name", document.PayerFullName);
		Assert.Equal("CODE123", document.ReceiptCode);
		Assert.Equal("Purpose", document.PaymentPurpose);
		Assert.Equal("IBAN1", document.SenderIban);
		Assert.Equal("IBAN2", document.ReceiverIban);
	}

	[Fact]
	public async Task ApplyAsync_ShouldMapWaybillItems_WhenDocumentIsWaybill()
	{
		// Arrange
		await using var db = _fixture.CreateContext();
		var sut = new PurchaseDocumentOcrDispatcher(db);
		
		var campaignId = Guid.NewGuid();
		var document = new WaybillDocument
		{
			Id = Guid.NewGuid(),
			Purchase = new CampaignPurchase { Id = Guid.NewGuid(), CampaignId = campaignId, Title = "P" },
			Items = new List<CampaignItem>()
		};

		var ocrResult = new DocumentOcrResult(
			true,
			"Vendor",
			new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
			1500m,
			new[]
			{
				new OcrParsedItem("Item 1", 10m, 100m, 1000m),
				new OcrParsedItem("Item 2", 1m, 500m, 500m)
			},
			"{}",
			null);

		// Act
		await sut.ApplyAsync(document, ocrResult, CancellationToken.None);

		// Assert
		Assert.Equal(2, document.Items.Count);
		Assert.Contains(document.Items, i => i.Name == "Item 1" && i.Quantity == 10m && i.UnitPrice == 10000 && i.TotalPrice == 100000);
		Assert.Contains(document.Items, i => i.Name == "Item 2" && i.Quantity == 1m && i.UnitPrice == 50000 && i.TotalPrice == 50000);
	}
}
