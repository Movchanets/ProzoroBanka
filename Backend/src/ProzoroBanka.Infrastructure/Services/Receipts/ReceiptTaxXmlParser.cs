using System.Globalization;
using System.Text;
using System.Xml.Linq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class ReceiptTaxXmlParser : IReceiptTaxXmlParser
{
    static ReceiptTaxXmlParser()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public async Task<TaxReceiptXmlParseResult> ParseAsync(Stream xmlStream, CancellationToken ct = default)
    {
        if (xmlStream.CanSeek)
            xmlStream.Position = 0;

        using var buffer = new MemoryStream();
        await xmlStream.CopyToAsync(buffer, ct);

        var xmlBytes = buffer.ToArray();
        var rawXml = DecodeXml(xmlBytes);

        using var xmlDocumentStream = new MemoryStream(xmlBytes);
        var document = XDocument.Load(xmlDocumentStream, LoadOptions.None);

        var dat = document.Root?.Element("DAT");
        var c = dat?.Element("C");
        var e = c?.Element("E");
        if (dat is null || c is null)
            throw new InvalidOperationException("Невірний XML формат чека");

        var items = c.Elements("P")
            .Select((node, index) => ParseItem(node, index))
            .Where(item => item is not null)
            .Cast<TaxReceiptXmlItemResult>()
            .OrderBy(item => item.SortOrder)
            .ToList();

        var totalAmount = ParseKopecks(dat.Attribute("SM")?.Value)
            ?? ParseKopecks(c.Element("E")?.Attribute("SM")?.Value)
            ?? items.Sum(item => item.TotalPrice ?? 0m);

        var fiscalNumber = NormalizeText(dat.Attribute("FN")?.Value)
            ?? NormalizeText(e?.Attribute("FN")?.Value);

        var receiptCode = NormalizeText(e?.Attribute("NO")?.Value);
        var merchantName = NormalizeText(dat.Attribute("TN")?.Value);

        var purchaseDateUtc = ParseReceiptDate(
            NormalizeText(e?.Attribute("TS")?.Value)
            ?? NormalizeText(dat.Element("TS")?.Value));

        var aggregateVatRate = ParseDecimal(e?.Attribute("TXPR")?.Value);
        var aggregateVatAmount = ParseKopecks(e?.Attribute("TXSM")?.Value);
        items = ApplyAggregateVat(items, aggregateVatRate, aggregateVatAmount);

        return new TaxReceiptXmlParseResult(
            merchantName,
            purchaseDateUtc,
            fiscalNumber,
            receiptCode,
            totalAmount,
            items,
            rawXml);
    }

    private static TaxReceiptXmlItemResult? ParseItem(XElement itemNode, int index)
    {
        var name = NormalizeText(itemNode.Attribute("NM")?.Value);
        if (string.IsNullOrWhiteSpace(name))
            return null;

        var total = ParseKopecks(itemNode.Attribute("SM")?.Value);
        var rawQuantity = ParseDecimal(itemNode.Attribute("Q")?.Value) ?? 1m;
        var unitPriceByCatalog = ParseKopecks(itemNode.Attribute("PRC")?.Value);
        var quantity = NormalizeQuantity(rawQuantity, unitPriceByCatalog, total);
        var unitPrice = unitPriceByCatalog
            ?? (quantity > 0 && total.HasValue ? Math.Round(total.Value / quantity.Value, 0, MidpointRounding.AwayFromZero) : total);
        var sortOrder = ParseInt(itemNode.Attribute("N")?.Value) ?? index;

        return new TaxReceiptXmlItemResult(
            name,
            quantity,
            unitPrice,
            total,
            NormalizeText(itemNode.Attribute("CD")?.Value),
            ParseDecimal(itemNode.Attribute("TXPR")?.Value),
            ParseKopecks(itemNode.Attribute("TXSM")?.Value),
            sortOrder);
    }

    private static List<TaxReceiptXmlItemResult> ApplyAggregateVat(
        List<TaxReceiptXmlItemResult> items,
        decimal? aggregateVatRate,
        decimal? aggregateVatAmount)
    {
        if (items.Count == 0)
            return items;

        var normalized = items
            .Select(item => aggregateVatRate.HasValue && !item.VatRate.HasValue
                ? item with { VatRate = aggregateVatRate }
                : item)
            .ToList();

        if (!aggregateVatAmount.HasValue)
            return normalized;

        var existingVatAmount = normalized.Where(item => item.VatAmount.HasValue).Sum(item => item.VatAmount ?? 0m);
        var remainingVatAmount = aggregateVatAmount.Value - existingVatAmount;
        if (remainingVatAmount <= 0)
            return normalized;

        var targets = normalized
            .Select((item, idx) => new { item, idx })
            .Where(entry => !entry.item.VatAmount.HasValue)
            .ToList();

        if (targets.Count == 0)
            return normalized;

        var denominator = targets.Sum(entry => entry.item.TotalPrice ?? 0m);
        var distributed = 0m;

        for (var i = 0; i < targets.Count; i++)
        {
            var target = targets[i];
            decimal vatAmount;

            if (i == targets.Count - 1)
            {
                vatAmount = remainingVatAmount - distributed;
            }
            else if (denominator > 0 && target.item.TotalPrice.HasValue)
            {
                vatAmount = Math.Round(
                    remainingVatAmount * (target.item.TotalPrice.Value / denominator),
                    0,
                    MidpointRounding.AwayFromZero);
                distributed += vatAmount;
            }
            else
            {
                vatAmount = 0m;
            }

            normalized[target.idx] = target.item with { VatAmount = vatAmount };
        }

        return normalized;
    }

    private static decimal? NormalizeQuantity(decimal? quantity, decimal? unitPriceKopecks, decimal? totalKopecks)
    {
        if (!quantity.HasValue)
            return null;

        if (quantity.Value <= 0)
            return null;

        if (!unitPriceKopecks.HasValue || !totalKopecks.HasValue || quantity.Value < 100)
            return quantity;

        var denominator = unitPriceKopecks.Value * quantity.Value;
        if (denominator <= 0)
            return quantity;

        var ratio = totalKopecks.Value / denominator;
        return ratio is > 0.0008m and < 0.0012m
            ? quantity.Value / 1000m
            : quantity;
    }

    private static string DecodeXml(byte[] bytes)
    {
        var declarationSample = Encoding.ASCII.GetString(bytes.Take(300).ToArray());
        var encodingName = TryReadDeclaredEncoding(declarationSample);

        if (!string.IsNullOrWhiteSpace(encodingName))
        {
            try
            {
                return Encoding.GetEncoding(encodingName).GetString(bytes);
            }
            catch
            {
                // Ignore and fallback below.
            }
        }

        try
        {
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return Encoding.GetEncoding(1251).GetString(bytes);
        }
    }

    private static string? TryReadDeclaredEncoding(string declarationSample)
    {
        var marker = "encoding=\"";
        var markerIndex = declarationSample.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
            return null;

        var start = markerIndex + marker.Length;
        var end = declarationSample.IndexOf('"', start);
        if (end <= start)
            return null;

        return declarationSample[start..end].Trim();
    }

    private static DateTime? ParseReceiptDate(string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
            return null;

        if (DateTime.TryParseExact(
            rawValue,
            "yyyyMMddHHmmss",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var parsed))
        {
            return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        }

        return null;
    }

    private static decimal? ParseKopecks(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (!long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var kopecks))
            return null;

        return Math.Round((decimal)kopecks, 0, MidpointRounding.AwayFromZero);
    }

    private static decimal? ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (decimal.TryParse(value.Replace(',', '.'), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
            return parsed;

        return null;
    }

    private static int? ParseInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            return parsed;

        return null;
    }

    private static string? NormalizeText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Trim();
    }
}
