using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItem;

public record DeleteReceiptItemCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId,
	Guid ReceiptItemId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
