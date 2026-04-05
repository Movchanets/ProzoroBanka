using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ReorderReceiptItemPhotos;

public class ReorderReceiptItemPhotosHandler : IRequestHandler<ReorderReceiptItemPhotosCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IFileStorage _fileStorage;

    public ReorderReceiptItemPhotosHandler(IApplicationDbContext db, IFileStorage fileStorage)
    {
        _db = db;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ReorderReceiptItemPhotosCommand request, CancellationToken ct)
    {
        var receipt = await _db.Receipts
            .Include(r => r.ItemPhotos)
            .Include(r => r.Campaign)
            .FirstOrDefaultAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);

        if (receipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        var photos = receipt.ItemPhotos
            .Where(item => !item.IsDeleted)
            .OrderBy(item => item.SortOrder)
            .ToList();

        if (photos.Count != request.PhotoIds.Count || photos.Any(photo => !request.PhotoIds.Contains(photo.Id)))
            return ServiceResponse<ReceiptPipelineDto>.Failure("Список фото для сортування некоректний");

        for (var index = 0; index < request.PhotoIds.Count; index++)
        {
            var photo = photos.First(item => item.Id == request.PhotoIds[index]);
            photo.SortOrder = index;
        }

        await _db.SaveChangesAsync(ct);
        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
    }
}
