using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.UploadDocument;

public record UploadDocumentCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Guid? CampaignId,
	Guid PurchaseId,
	Stream FileStream,
	string FileName,
	string ContentType,
	DocumentType Type,
	DateTime? DocumentDate,
	long? Amount,
	string? CounterpartyName) : IRequest<ServiceResponse<DocumentDto>>;
