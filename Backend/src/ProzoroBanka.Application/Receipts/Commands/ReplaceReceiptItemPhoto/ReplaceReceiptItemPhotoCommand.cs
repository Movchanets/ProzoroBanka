using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Commands.AddReceiptItemPhotos;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ReplaceReceiptItemPhoto;

public record ReplaceReceiptItemPhotoCommand(
    Guid CallerDomainUserId,
    Guid ReceiptId,
    Guid PhotoId,
    ReceiptUploadFile File) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
