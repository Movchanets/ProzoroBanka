using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptOcrDraft;

public record UpdateReceiptOcrDraftCommand(
	Guid CallerDomainUserId,
	Guid ReceiptId,
	string? MerchantName,
	decimal? TotalAmount,
	DateTime? PurchaseDateUtc,
	string? FiscalNumber,
	string? ReceiptCode,
	string? Currency,
	string? PurchasedItemName,
	string? OcrStructuredPayloadJson) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
