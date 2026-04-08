using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptDraftFile;

public record UpdateReceiptDraftFileCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId,
	Stream FileStream,
	string FileName,
	string ContentType) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
