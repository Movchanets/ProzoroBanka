using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Receipts.Commands.AddReceiptItem;

public class AddReceiptItemHandler : IRequestHandler<AddReceiptItemCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IOrganizationAuthorizationService _orgAuth;
    private readonly IFileStorage _fileStorage;

    public AddReceiptItemHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
    {
        _db = db;
        _orgAuth = orgAuth;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(AddReceiptItemCommand request, CancellationToken ct)
    {
        var receipt = await _db.FindAccessibleWithPipelineGraphAsync(_orgAuth, request.ReceiptId, request.CallerDomainUserId, ct);

        if (receipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        var nextSortOrder = receipt.Items
            .Where(item => !item.IsDeleted)
            .Select(item => (int?)item.SortOrder)
            .Max() is int maxSortOrder
            ? maxSortOrder + 1
            : 0;

        var item = new CampaignItem
        {
            ReceiptId = receipt.Id,
            Name = request.Name.Trim(),
            Quantity = request.Quantity ?? 0m,
            UnitPrice = (long)((request.UnitPrice ?? 0m) * 100),
            TotalPrice = (long)((request.TotalPrice ?? 0m) * 100),
            Barcode = string.IsNullOrWhiteSpace(request.Barcode) ? null : request.Barcode.Trim(),
            VatRate = request.VatRate,
            VatAmount = request.VatAmount,
            SortOrder = nextSortOrder,
        };

        _db.CampaignItems.Add(item);

        if (request.PhotoIds is not null && request.PhotoIds.Count > 0)
        {
            var photos = receipt.ItemPhotos
                .Where(photo => !photo.IsDeleted && request.PhotoIds.Contains(photo.Id))
                .ToList();

            foreach (var photo in photos)
                photo.CampaignItemId = item.Id;
        }

        await _db.SaveChangesAsync(ct);

        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
    }
}
