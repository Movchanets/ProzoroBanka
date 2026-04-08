using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Campaigns.Commands.AttachReceiptToCampaign;

public record AttachReceiptToCampaignCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	Guid ReceiptId) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
