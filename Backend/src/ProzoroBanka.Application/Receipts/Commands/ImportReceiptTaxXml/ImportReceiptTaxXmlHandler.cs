using System.Text.Json;
using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Receipts.Commands.ImportReceiptTaxXml;

public class ImportReceiptTaxXmlHandler : IRequestHandler<ImportReceiptTaxXmlCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IOrganizationAuthorizationService _orgAuth;
    private readonly IFileStorage _fileStorage;
    private readonly IReceiptTaxXmlParser _xmlParser;

    public ImportReceiptTaxXmlHandler(
        IApplicationDbContext db,
        IOrganizationAuthorizationService orgAuth,
        IFileStorage fileStorage,
        IReceiptTaxXmlParser xmlParser)
    {
        _db = db;
        _orgAuth = orgAuth;
        _fileStorage = fileStorage;
        _xmlParser = xmlParser;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ImportReceiptTaxXmlCommand request, CancellationToken ct)
    {
        var receipt = await _db.FindAccessibleWithPipelineGraphAsync(_orgAuth, request.ReceiptId, request.CallerDomainUserId, ct);

        if (receipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        TaxReceiptXmlParseResult parsed;
        try
        {
            parsed = await _xmlParser.ParseAsync(request.XmlStream, ct);
        }
        catch (Exception)
        {
            return ServiceResponse<ReceiptPipelineDto>.Failure("Не вдалося прочитати XML чека");
        }

        receipt.MerchantName = parsed.MerchantName ?? receipt.MerchantName;
        receipt.PurchaseDateUtc = parsed.PurchaseDateUtc ?? receipt.PurchaseDateUtc;
        receipt.TransactionDate = parsed.PurchaseDateUtc ?? receipt.TransactionDate;
        receipt.FiscalNumber = parsed.FiscalNumber ?? receipt.FiscalNumber;
        receipt.ReceiptCode = parsed.ReceiptCode ?? receipt.ReceiptCode;
        receipt.TotalAmount = parsed.TotalAmount ?? receipt.TotalAmount;
        receipt.StateVerifiedAtUtc = null;

        foreach (var photo in receipt.ItemPhotos.Where(photo => !photo.IsDeleted))
            photo.ReceiptItemId = null;

        var existingItems = receipt.Items.Where(item => !item.IsDeleted).ToList();
        if (existingItems.Count > 0)
            _db.ReceiptItems.RemoveRange(existingItems);

        var newItems = parsed.Items
            .OrderBy(item => item.SortOrder)
            .Select((item, index) => new ReceiptItem
            {
                ReceiptId = receipt.Id,
                Name = item.Name,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                TotalPrice = item.TotalPrice,
                Barcode = item.Barcode,
                VatRate = item.VatRate,
                VatAmount = item.VatAmount,
                SortOrder = index,
            })
            .ToList();

        if (newItems.Count > 0)
            _db.ReceiptItems.AddRange(newItems);

        receipt.OcrStructuredPayloadJson = BuildStructuredPayloadJson(parsed.Items);
        receipt.RawOcrJson = parsed.RawXml;
        ReceiptMutationHelpers.RefreshVerificationReference(receipt);

        await _db.SaveChangesAsync(ct);

        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
    }

    private static string BuildStructuredPayloadJson(IReadOnlyList<TaxReceiptXmlItemResult> items)
    {
        var payload = new
        {
            items = items
                .OrderBy(item => item.SortOrder)
                .Select(item => new
                {
                    name = item.Name,
                    quantity = item.Quantity,
                    unit_price = item.UnitPrice,
                    total_price = item.TotalPrice,
                    barcode = item.Barcode,
                    vat_rate = item.VatRate,
                    vat_amount = item.VatAmount,
                })
                .ToList(),
        };

        return JsonSerializer.Serialize(payload);
    }
}
