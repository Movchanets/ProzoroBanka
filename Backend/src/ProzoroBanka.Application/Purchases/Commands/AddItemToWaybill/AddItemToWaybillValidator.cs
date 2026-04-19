using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.AddItemToWaybill;

public class AddItemToWaybillValidator : AbstractValidator<AddItemToWaybillCommand>
{
	public AddItemToWaybillValidator()
	{
		RuleFor(x => x.CallerDomainUserId)
			.NotEmpty().WithMessage("CallerDomainUserId обов'язковий");

		RuleFor(x => x.WaybillDocumentId)
			.NotEmpty().WithMessage("WaybillDocumentId обов'язковий");

		RuleFor(x => x.Name)
			.NotEmpty().WithMessage("Назва позиції обов'язкова")
			.MaximumLength(512).WithMessage("Назва не може перевищувати 512 символів");

		RuleFor(x => x.Quantity)
			.GreaterThan(0).WithMessage("Кількість має бути більшою за 0");

		RuleFor(x => x.UnitPrice)
			.GreaterThanOrEqualTo(0).WithMessage("Ціна має бути не меншою за 0");
	}
}