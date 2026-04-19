using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Purchases.Commands.AttachPurchaseToCampaign;

public record AttachPurchaseToCampaignCommand(
    Guid PurchaseId,
    Guid CampaignId
) : IRequest<ServiceResponse>;
