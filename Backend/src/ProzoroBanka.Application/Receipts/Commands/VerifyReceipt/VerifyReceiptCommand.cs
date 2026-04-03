using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.VerifyReceipt;

public record VerifyReceiptCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId,
	Guid OrganizationId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
