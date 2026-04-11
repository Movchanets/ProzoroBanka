using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItem;

public class DeleteReceiptItemValidator : AbstractValidator<DeleteReceiptItemCommand>
{
	public DeleteReceiptItemValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
		RuleFor(x => x.ReceiptItemId).NotEmpty();
	}
}
