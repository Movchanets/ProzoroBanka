using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Purchases.Commands.AddItemToWaybill;

public record AddItemToWaybillCommand(
    Guid CallerDomainUserId,
    Guid WaybillDocumentId,
    string Name,
    decimal Quantity,
    long UnitPrice
) : IRequest<ServiceResponse<Guid>>;
