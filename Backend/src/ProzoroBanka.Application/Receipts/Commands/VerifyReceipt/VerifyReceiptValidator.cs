using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.VerifyReceipt;

public class VerifyReceiptValidator : AbstractValidator<VerifyReceiptCommand>
{
	public VerifyReceiptValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
	}
}
