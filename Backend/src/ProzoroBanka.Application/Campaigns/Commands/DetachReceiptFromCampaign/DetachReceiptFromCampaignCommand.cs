using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.DetachReceiptFromCampaign;

public record DetachReceiptFromCampaignCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	Guid ReceiptId) : IRequest<ServiceResponse<Unit>>;
