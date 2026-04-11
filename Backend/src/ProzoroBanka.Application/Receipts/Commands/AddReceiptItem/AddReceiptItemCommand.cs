using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.AddReceiptItem;

public record AddReceiptItemCommand(
    Guid CallerDomainUserId,
    Guid ReceiptId,
    string Name,
    decimal? Quantity,
    decimal? UnitPrice,
    decimal? TotalPrice,
    string? Barcode,
    decimal? VatRate,
    decimal? VatAmount,
    IReadOnlyList<Guid>? PhotoIds = null) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
