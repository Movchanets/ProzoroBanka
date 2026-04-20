using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Queries.GetOrganizationPurchases;

public record GetOrganizationPurchasesQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	PurchaseStatus? StatusFilter = null,
	bool OnlyUnattached = false) : IRequest<ServiceResponse<IReadOnlyList<PurchaseListItemDto>>>;
