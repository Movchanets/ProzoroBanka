using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.CreateDraftPurchase;

public class CreateDraftPurchaseValidator : AbstractValidator<CreateDraftPurchaseCommand>
{
	public CreateDraftPurchaseValidator()
	{
		RuleFor(x => x.CallerDomainUserId)
			.NotEmpty().WithMessage("CallerDomainUserId обов'язковий");

		RuleFor(x => x.OrganizationId)
			.NotEmpty().WithMessage("OrganizationId обов'язковий");

		RuleFor(x => x.Title)
			.NotEmpty().WithMessage("Назва закупівлі обов'язкова")
			.MaximumLength(500).WithMessage("Назва не може перевищувати 500 символів");

		RuleFor(x => x.Description)
			.MaximumLength(2000).WithMessage("Опис не може перевищувати 2000 символів")
			.When(x => x.Description is not null);
	}
}