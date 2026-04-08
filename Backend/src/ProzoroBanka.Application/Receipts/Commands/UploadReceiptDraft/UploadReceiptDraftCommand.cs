using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.UploadReceiptDraft;

public record UploadReceiptDraftCommand(
	Guid CallerDomainUserId,
	Stream FileStream,
	string FileName,
	string ContentType,
	long FileSize) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
