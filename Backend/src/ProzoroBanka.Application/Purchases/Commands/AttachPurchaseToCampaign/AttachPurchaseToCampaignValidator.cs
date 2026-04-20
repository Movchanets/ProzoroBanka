using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.AttachPurchaseToCampaign;

public class AttachPurchaseToCampaignValidator : AbstractValidator<AttachPurchaseToCampaignCommand>
{
	public AttachPurchaseToCampaignValidator()
	{
		RuleFor(x => x.CallerDomainUserId)
			.NotEmpty().WithMessage("CallerDomainUserId обов'язковий");

		RuleFor(x => x.PurchaseId)
			.NotEmpty().WithMessage("PurchaseId обов'язковий");

		RuleFor(x => x.CampaignId)
			.NotEmpty().WithMessage("CampaignId обов'язковий");
	}
}