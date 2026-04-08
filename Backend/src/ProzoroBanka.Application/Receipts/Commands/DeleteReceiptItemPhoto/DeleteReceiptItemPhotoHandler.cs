using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItemPhoto;

public class DeleteReceiptItemPhotoHandler : IRequestHandler<DeleteReceiptItemPhotoCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IFileStorage _fileStorage;

    public DeleteReceiptItemPhotoHandler(IApplicationDbContext db, IFileStorage fileStorage)
    {
        _db = db;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(DeleteReceiptItemPhotoCommand request, CancellationToken ct)
    {
        var receipt = await _db.Receipts
            .Include(r => r.ItemPhotos)
            .Include(r => r.Campaign)
            .FirstOrDefaultAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);

        if (receipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        var photo = receipt.ItemPhotos.FirstOrDefault(item => item.Id == request.PhotoId && !item.IsDeleted);
        if (photo is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Фото товару не знайдено");

        await _fileStorage.DeleteAsync(photo.StorageKey, ct);
        receipt.ItemPhotos.Remove(photo);
        _db.ReceiptItemPhotos.Remove(photo);

        var orderedPhotos = receipt.ItemPhotos
            .Where(item => !item.IsDeleted)
            .OrderBy(item => item.SortOrder)
            .ToList();

        for (var index = 0; index < orderedPhotos.Count; index++)
        {
            orderedPhotos[index].SortOrder = index;
        }

        await _db.SaveChangesAsync(ct);
        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
    }
}
