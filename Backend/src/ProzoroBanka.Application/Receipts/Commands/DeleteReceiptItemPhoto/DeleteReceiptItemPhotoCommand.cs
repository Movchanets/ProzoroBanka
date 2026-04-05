using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItemPhoto;

public record DeleteReceiptItemPhotoCommand(
    Guid CallerDomainUserId,
    Guid ReceiptId,
    Guid PhotoId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
