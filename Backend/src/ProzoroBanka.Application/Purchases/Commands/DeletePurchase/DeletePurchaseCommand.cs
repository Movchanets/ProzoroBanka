using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Purchases.Commands.DeletePurchase;

public record DeletePurchaseCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid CampaignId,
	Guid PurchaseId) : IRequest<ServiceResponse>;
