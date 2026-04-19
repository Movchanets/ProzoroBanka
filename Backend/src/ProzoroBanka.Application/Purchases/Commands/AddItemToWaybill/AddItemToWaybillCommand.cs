using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Purchases.Commands.AddItemToWaybill;

public record AddItemToWaybillCommand(
    Guid WaybillDocumentId,
    string Name,
    decimal Quantity,
    long UnitPrice
) : IRequest<ServiceResponse<Guid>>;
