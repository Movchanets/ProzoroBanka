using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptItem;

public class UpdateReceiptItemValidator : AbstractValidator<UpdateReceiptItemCommand>
{
	public UpdateReceiptItemValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
		RuleFor(x => x.ReceiptItemId).NotEmpty();
		RuleFor(x => x.Name).NotEmpty().MaximumLength(512);
		RuleFor(x => x.Quantity).GreaterThan(0).When(x => x.Quantity.HasValue);
		RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0).When(x => x.UnitPrice.HasValue);
		RuleFor(x => x.TotalPrice).GreaterThanOrEqualTo(0).When(x => x.TotalPrice.HasValue);
		RuleFor(x => x.Barcode).MaximumLength(128);
	}
}