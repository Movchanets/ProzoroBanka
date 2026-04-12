using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ReplaceReceiptItemPhoto;

public class ReplaceReceiptItemPhotoHandler : IRequestHandler<ReplaceReceiptItemPhotoCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IOrganizationAuthorizationService _orgAuth;
    private readonly IFileStorage _fileStorage;

    public ReplaceReceiptItemPhotoHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
    {
        _db = db;
        _orgAuth = orgAuth;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ReplaceReceiptItemPhotoCommand request, CancellationToken ct)
    {
        var receipt = await _db.FindAccessibleWithPipelineGraphAsync(_orgAuth, request.ReceiptId, request.CallerDomainUserId, ct);

        if (receipt is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

        var photo = receipt.ItemPhotos.FirstOrDefault(item => item.Id == request.PhotoId && !item.IsDeleted);
        if (photo is null)
            return ServiceResponse<ReceiptPipelineDto>.Failure("Фото товару не знайдено");

        await _fileStorage.DeleteAsync(photo.StorageKey, ct);

        request.File.FileStream.Position = 0;
        var storageKey = await _fileStorage.UploadAsync(request.File.FileStream, request.File.FileName, request.File.ContentType, ct);

        photo.StorageKey = storageKey;
        photo.OriginalFileName = request.File.FileName;

        await _db.SaveChangesAsync(ct);
        return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
    }
}
