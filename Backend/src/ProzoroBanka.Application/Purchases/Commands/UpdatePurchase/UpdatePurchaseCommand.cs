using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.UpdatePurchase;

public record UpdatePurchaseCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid? CampaignId,
	Guid PurchaseId,
	string? Title,
	long? TotalAmount,
	PurchaseStatus? Status) : IRequest<ServiceResponse<PurchaseDetailDto>>;
