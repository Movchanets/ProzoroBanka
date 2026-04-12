using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ReorderReceiptItemPhotos;

public class ReorderReceiptItemPhotosHandler : IRequestHandler<ReorderReceiptItemPhotosCommand, ServiceResponse<ReceiptPipelineDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IOrganizationAuthorizationService _orgAuth;
    private readonly IFileStorage _fileStorage;

    public ReorderReceiptItemPhotosHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
    {
        _db = db;
        _orgAuth = orgAuth;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ReorderReceiptItemPhotosCommand request, CancellationToken ct)
    {
        var receipt = await _db.FindAccessibleWithPipelineGraphAsync(_orgAuth, request.ReceiptId, request.CallerDomainUserId, ct);

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
