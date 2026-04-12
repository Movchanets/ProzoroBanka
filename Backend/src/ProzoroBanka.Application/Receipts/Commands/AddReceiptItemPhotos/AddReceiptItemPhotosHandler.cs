using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Receipts.Commands.AddReceiptItemPhotos;

public class AddReceiptItemPhotosHandler : IRequestHandler<AddReceiptItemPhotosCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IOrganizationAuthorizationService _orgAuth;
    private readonly IFileStorage _fileStorage;

    public AddReceiptItemPhotosHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
    {
        _db = db;
        _orgAuth = orgAuth;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(AddReceiptItemPhotosCommand request, CancellationToken ct)
    {
        var receipt = await _db.FindAccessibleWithPipelineGraphAsync(
            _orgAuth,
            request.ReceiptId,
            request.CallerDomainUserId,
            ct);

        if (receipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        var maxSortOrder = await _db.ReceiptItemPhotos
            .AsNoTracking()
            .Where(photo => photo.ReceiptId == request.ReceiptId)
            .Select(photo => (int?)photo.SortOrder)
            .MaxAsync(ct);

        var nextSortOrder = (maxSortOrder ?? -1) + 1;

        foreach (var file in request.Files)
        {
            file.FileStream.Position = 0;
            var storageKey = await _fileStorage.UploadAsync(file.FileStream, file.FileName, file.ContentType, ct);

            _db.ReceiptItemPhotos.Add(new ReceiptItemPhoto
            {
                ReceiptId = request.ReceiptId,
                StorageKey = storageKey,
                OriginalFileName = file.FileName,
                SortOrder = nextSortOrder++,
            });
        }

        await _db.SaveChangesAsync(ct);

        var refreshedReceipt = await _db.FindWithPipelineGraphByIdAsync(request.ReceiptId, ct);
        if (refreshedReceipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, refreshedReceipt));
    }
}
