using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Commands.UpdateWaybillItem;

public record UpdateWaybillItemCommand(
	Guid CallerDomainUserId,
	Guid WaybillDocumentId,
	Guid WaybillItemId,
	string Name,
	decimal Quantity,
	long UnitPrice
) : IRequest<ServiceResponse<DocumentDto>>;