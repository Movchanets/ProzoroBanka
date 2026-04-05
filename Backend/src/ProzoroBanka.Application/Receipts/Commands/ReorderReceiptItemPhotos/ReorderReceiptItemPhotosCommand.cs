using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ReorderReceiptItemPhotos;

public record ReorderReceiptItemPhotosCommand(
    Guid CallerDomainUserId,
    Guid ReceiptId,
    IReadOnlyList<Guid> PhotoIds) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
