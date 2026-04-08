using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;

public record ExtractReceiptDataCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId,
	Stream FileStream,
	string FileName,
	Guid OrganizationId,
	string? ModelIdentifier = null) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
