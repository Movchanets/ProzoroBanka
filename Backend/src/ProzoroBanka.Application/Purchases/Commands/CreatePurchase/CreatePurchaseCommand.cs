using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Commands.CreatePurchase;

public record CreatePurchaseCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid CampaignId,
	string Title,
	long TotalAmount) : IRequest<ServiceResponse<PurchaseDetailDto>>;
