using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Queries.GetCampaignPurchases;

public record GetCampaignPurchasesQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid CampaignId,
	PurchaseStatus? StatusFilter = null) : IRequest<ServiceResponse<IReadOnlyList<PurchaseListItemDto>>>;
