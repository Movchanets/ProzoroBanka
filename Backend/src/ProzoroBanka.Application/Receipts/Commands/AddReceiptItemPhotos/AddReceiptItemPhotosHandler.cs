using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Receipts.Commands.AddReceiptItemPhotos;

public class AddReceiptItemPhotosHandler : IRequestHandler<AddReceiptItemPhotosCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IFileStorage _fileStorage;

    public AddReceiptItemPhotosHandler(IApplicationDbContext db, IFileStorage fileStorage)
    {
        _db = db;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(AddReceiptItemPhotosCommand request, CancellationToken ct)
    {
        var receiptExists = await _db.Receipts
            .AsNoTracking()
            .AnyAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);

        if (!receiptExists)
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

        var receipt = await _db.Receipts
            .AsNoTracking()
            .Include(r => r.ItemPhotos)
            .Include(r => r.Campaign)
            .FirstAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);

        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
    }
}
