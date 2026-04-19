using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.UpdatePurchase;

public class UpdatePurchaseValidator : AbstractValidator<UpdatePurchaseCommand>
{
	public UpdatePurchaseValidator()
	{
		RuleFor(x => x.OrganizationId)
			.NotEmpty().WithMessage("OrganizationId обов'язковий");

		RuleFor(x => x.CampaignId)
			.NotEmpty().WithMessage("CampaignId обов'язковий")
			.When(x => x.CampaignId.HasValue);

		RuleFor(x => x.PurchaseId)
			.NotEmpty().WithMessage("PurchaseId обов'язковий");

		RuleFor(x => x.Title)
			.MaximumLength(500).WithMessage("Назва не може перевищувати 500 символів")
			.When(x => x.Title is not null);

		RuleFor(x => x.TotalAmount)
			.GreaterThan(0).WithMessage("Сума має бути більше 0")
			.When(x => x.TotalAmount.HasValue);

		RuleFor(x => x.Status)
			.IsInEnum().WithMessage("Невірний статус закупівлі")
			.When(x => x.Status.HasValue);

		RuleFor(x => x)
			.Must(x => x.Title is not null || x.TotalAmount.HasValue || x.Status.HasValue)
			.WithMessage("Потрібно передати хоча б одне поле для оновлення");
	}
}
