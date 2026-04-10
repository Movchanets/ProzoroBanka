using System.Text;
using ProzoroBanka.Infrastructure.Services.Receipts;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Receipts;

public class ReceiptTaxXmlParserTests
{
    static ReceiptTaxXmlParserTests()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    [Fact]
    public async Task ParseAsync_WhenValidTaxXml_ReturnsReceiptFieldsAndItems()
    {
        var xml = "<?xml version=\"1.0\" encoding=\"windows-1251\"?><RQ><DAT FN=\"3001041442\" TN=\"Store #1\" SM=\"21568\"><C><P N=\"1\" NM=\"Тест товар\" SM=\"2699\" CD=\"4823096005591\"></P><P N=\"2\" NM=\"Snack\" SM=\"4499\"></P><E NO=\"10810084\" TS=\"20260403152428\" FN=\"3001041442\" SM=\"21568\"></E></C><TS>20260403152428</TS></DAT></RQ>";
        var bytes = Encoding.GetEncoding(1251).GetBytes(xml);
        await using var stream = new MemoryStream(bytes);

        var sut = new ReceiptTaxXmlParser();

        var result = await sut.ParseAsync(stream, CancellationToken.None);

        Assert.Equal("Store #1", result.MerchantName);
        Assert.Equal("3001041442", result.FiscalNumber);
        Assert.Equal("10810084", result.ReceiptCode);
        Assert.Equal(21568m, result.TotalAmount);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal("Тест товар", result.Items[0].Name);
        Assert.Equal(2699m, result.Items[0].TotalPrice);
        Assert.Equal(1m, result.Items[0].Quantity);
    }

    [Fact]
    public async Task ParseAsync_WhenWeightedItemAndAggregateVat_ParsesQuantityAndVat()
    {
        var xml = "<?xml version=\"1.0\" encoding=\"windows-1251\"?><RQ><DAT FN=\"3000751015\" TN=\"Store\"><C><P N=\"4\" NM=\"Сир\" Q=\"136\" PRC=\"41064\" SM=\"5585\" CD=\"2081734901366\"></P><P N=\"5\" NM=\"Pepsi\" SM=\"17964\" CD=\"4823063129374\"></P><E NO=\"23070113\" TS=\"20260409162115\" FN=\"3000751015\" SM=\"34040\" TXPR=\"20.00\" TXSM=\"5673\"></E></C><TS>20260409162115</TS></DAT></RQ>";
        var bytes = Encoding.GetEncoding(1251).GetBytes(xml);
        await using var stream = new MemoryStream(bytes);

        var sut = new ReceiptTaxXmlParser();

        var result = await sut.ParseAsync(stream, CancellationToken.None);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(0.136m, result.Items[0].Quantity);
        Assert.Equal(41064m, result.Items[0].UnitPrice);
        Assert.Equal(20m, result.Items[0].VatRate);
        Assert.Equal(20m, result.Items[1].VatRate);
        Assert.Equal(5673m, result.Items.Sum(item => item.VatAmount ?? 0m));
    }
}
