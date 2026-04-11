using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceipt;

public record DeleteReceiptCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId) : IRequest<ServiceResponse>;
