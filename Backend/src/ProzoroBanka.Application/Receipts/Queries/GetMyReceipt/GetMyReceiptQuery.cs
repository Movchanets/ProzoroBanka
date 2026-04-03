using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Queries.GetMyReceipt;

public record GetMyReceiptQuery(Guid CallerDomainUserId, Guid ReceiptId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
