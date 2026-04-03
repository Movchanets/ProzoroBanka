using ProzoroBanka.Infrastructure.Services.Receipts;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Receipts;

public class StubReceiptStructuredExtractionServiceTests
{
	[Fact]
	public async Task ExtractAsync_ReturnsDeterministicSingleResult()
	{
		var service = new StubReceiptStructuredExtractionService();
		await using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

		var result = await service.ExtractAsync(stream, "receipt.png", CancellationToken.None);

		Assert.True(result.Success);
		Assert.Equal("OCR Stub Merchant", result.MerchantName);
		Assert.Equal(123.45m, result.TotalAmount);
		Assert.Equal("STUB-FISCAL-0001", result.FiscalNumber);
		Assert.Equal("STUB-CODE-0001", result.ReceiptCode);
	}
}
