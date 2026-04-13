using FluentValidation;

namespace ProzoroBanka.Application.Campaigns.Commands.DetachReceiptFromCampaign;

public class DetachReceiptFromCampaignValidator : AbstractValidator<DetachReceiptFromCampaignCommand>
{
	public DetachReceiptFromCampaignValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
	}
}
