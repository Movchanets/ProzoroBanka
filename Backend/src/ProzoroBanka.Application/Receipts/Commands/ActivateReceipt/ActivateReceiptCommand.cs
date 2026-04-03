using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ActivateReceipt;

public record ActivateReceiptCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
