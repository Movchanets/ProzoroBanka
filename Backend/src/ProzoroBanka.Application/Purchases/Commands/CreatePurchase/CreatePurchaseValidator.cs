using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.CreatePurchase;

public class CreatePurchaseValidator : AbstractValidator<CreatePurchaseCommand>
{
	public CreatePurchaseValidator()
	{
		RuleFor(x => x.Title)
			.NotEmpty().WithMessage("Назва закупівлі обов'язкова")
			.MaximumLength(500).WithMessage("Назва не може перевищувати 500 символів");

		RuleFor(x => x.TotalAmount)
			.GreaterThanOrEqualTo(0).WithMessage("Сума не може бути від'ємною");

		RuleFor(x => x.CampaignId)
			.NotEmpty().WithMessage("CampaignId обов'язковий");

		RuleFor(x => x.OrganizationId)
			.NotEmpty().WithMessage("OrganizationId обов'язковий");
	}
}
