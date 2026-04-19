using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Queries.GetPublicCampaignPurchases;

public record GetPublicCampaignPurchasesQuery(
	Guid CampaignId) : IRequest<ServiceResponse<IReadOnlyList<PurchaseDetailDto>>>;
