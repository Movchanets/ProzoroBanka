using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Commands.DeleteWaybillItem;

public record DeleteWaybillItemCommand(
	Guid CallerDomainUserId,
	Guid WaybillDocumentId,
	Guid WaybillItemId
) : IRequest<ServiceResponse<DocumentDto>>;