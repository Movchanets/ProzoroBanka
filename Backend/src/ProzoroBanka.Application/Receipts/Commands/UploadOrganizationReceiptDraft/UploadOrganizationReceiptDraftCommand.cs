using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.UploadOrganizationReceiptDraft;

public record UploadOrganizationReceiptDraftCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Stream FileStream,
	string FileName,
	string ContentType,
	long FileSize) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
