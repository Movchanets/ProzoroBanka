using FluentValidation;

namespace ProzoroBanka.Application.Campaigns.Commands.AttachReceiptToCampaign;

public class AttachReceiptToCampaignValidator : AbstractValidator<AttachReceiptToCampaignCommand>
{
	public AttachReceiptToCampaignValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
	}
}
