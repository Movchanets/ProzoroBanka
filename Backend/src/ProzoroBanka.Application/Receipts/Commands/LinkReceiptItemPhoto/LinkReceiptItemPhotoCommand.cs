using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.LinkReceiptItemPhoto;

public record LinkReceiptItemPhotoCommand(
    Guid CallerDomainUserId,
    Guid ReceiptId,
    Guid PhotoId,
    Guid? ReceiptItemId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
