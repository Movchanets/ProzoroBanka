using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.LinkReceiptItemPhoto;

public class LinkReceiptItemPhotoHandler : IRequestHandler<LinkReceiptItemPhotoCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IFileStorage _fileStorage;

    public LinkReceiptItemPhotoHandler(IApplicationDbContext db, IFileStorage fileStorage)
    {
        _db = db;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(LinkReceiptItemPhotoCommand request, CancellationToken ct)
    {
        var receipt = await _db.FindOwnedWithPipelineGraphAsync(request.ReceiptId, request.CallerDomainUserId, ct);

        if (receipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        var photo = receipt.ItemPhotos.FirstOrDefault(p => p.Id == request.PhotoId && !p.IsDeleted);
        if (photo is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Фото товару не знайдено");

        if (request.ReceiptItemId.HasValue)
        {
            var itemExists = receipt.Items.Any(item => item.Id == request.ReceiptItemId.Value && !item.IsDeleted);
            if (!itemExists)
                return ServiceResponse<ReceiptPipelineDto>.Failure("Позицію товару не знайдено");
        }

        photo.ReceiptItemId = request.ReceiptItemId;
        await _db.SaveChangesAsync(ct);

        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
    }
}
