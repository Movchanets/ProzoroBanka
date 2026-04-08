using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.UploadReceiptDraft;

public class UploadReceiptDraftValidator : AbstractValidator<UploadReceiptDraftCommand>
{
	public UploadReceiptDraftValidator()
	{
		RuleFor(x => x.FileName).NotEmpty().MaximumLength(256);
		RuleFor(x => x.ContentType).NotEmpty().MaximumLength(128);
		RuleFor(x => x.FileSize).GreaterThan(0).LessThanOrEqualTo(20 * 1024 * 1024);
	}
}
