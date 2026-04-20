using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Purchases.Commands.DeleteDocument;

public record DeleteDocumentCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid? CampaignId,
	Guid PurchaseId,
	Guid DocumentId) : IRequest<ServiceResponse>;
