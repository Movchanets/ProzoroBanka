using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;

namespace ProzoroBanka.Application.Purchases.Commands.UpdateDocumentMetadata;

public record UpdateDocumentMetadataCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid? CampaignId,
	Guid PurchaseId,
	Guid DocumentId,
	long? Amount,
	string? CounterpartyName,
	DateTime? DocumentDate,
	string? Edrpou = null,
	string? PayerFullName = null,
	string? ReceiptCode = null,
	string? PaymentPurpose = null,
	string? SenderIban = null,
	string? ReceiverIban = null) : IRequest<ServiceResponse<DocumentDto>>;
