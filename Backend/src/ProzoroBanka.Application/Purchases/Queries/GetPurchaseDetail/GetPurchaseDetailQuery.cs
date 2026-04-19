using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Queries.GetPurchaseDetail;

public record GetPurchaseDetailQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid? CampaignId,
	Guid PurchaseId) : IRequest<ServiceResponse<PurchaseDetailDto>>;
