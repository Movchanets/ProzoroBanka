using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptItem;

public record UpdateReceiptItemCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId,
	Guid ReceiptItemId,
	string Name,
	decimal? Quantity,
	decimal? UnitPrice,
	decimal? TotalPrice,
	string? Barcode,
	decimal? VatRate,
	decimal? VatAmount) : IRequest<ServiceResponse<ReceiptPipelineDto>>;