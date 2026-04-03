using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;

public class ExtractReceiptDataValidator : AbstractValidator<ExtractReceiptDataCommand>
{
	public ExtractReceiptDataValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.FileName).NotEmpty().MaximumLength(256);
	}
}
