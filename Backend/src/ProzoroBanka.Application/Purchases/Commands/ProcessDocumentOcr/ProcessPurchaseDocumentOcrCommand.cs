using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Commands.ProcessDocumentOcr;

public record ProcessPurchaseDocumentOcrCommand(
	Guid OrganizationId,
	Guid CampaignId,
	Guid PurchaseId,
	Guid DocumentId,
	Guid CallerDomainUserId
) : IRequest<ServiceResponse<DocumentDto>>;
