using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceipt;

public class DeleteReceiptValidator : AbstractValidator<DeleteReceiptCommand>
{
	public DeleteReceiptValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
	}
}
