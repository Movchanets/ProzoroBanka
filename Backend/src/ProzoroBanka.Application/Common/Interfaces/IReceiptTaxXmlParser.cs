using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IReceiptTaxXmlParser
{
    Task<TaxReceiptXmlParseResult> ParseAsync(Stream xmlStream, CancellationToken ct = default);
}
