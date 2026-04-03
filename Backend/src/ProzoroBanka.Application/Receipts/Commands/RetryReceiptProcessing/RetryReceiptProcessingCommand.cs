using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.RetryReceiptProcessing;

public record RetryReceiptProcessingCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
