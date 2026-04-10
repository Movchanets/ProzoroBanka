namespace ProzoroBanka.Application.Common.Models;

public record TaxReceiptXmlItemResult(
    string Name,
    decimal? Quantity,
    decimal? UnitPrice,
    decimal? TotalPrice,
    string? Barcode,
    decimal? VatRate,
    decimal? VatAmount,
    int SortOrder);

public record TaxReceiptXmlParseResult(
    string? MerchantName,
    DateTime? PurchaseDateUtc,
    string? FiscalNumber,
    string? ReceiptCode,
    decimal? TotalAmount,
    IReadOnlyList<TaxReceiptXmlItemResult> Items,
    string RawXml);
