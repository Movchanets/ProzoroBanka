using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Queries.GetPublicPurchaseById;

public record GetPublicPurchaseByIdQuery(Guid PurchaseId)
	: IRequest<ServiceResponse<PurchaseDetailDto>>;
