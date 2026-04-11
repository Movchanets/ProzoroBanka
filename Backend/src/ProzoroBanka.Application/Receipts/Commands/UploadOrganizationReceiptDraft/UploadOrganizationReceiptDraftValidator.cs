using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.UploadOrganizationReceiptDraft;

public class UploadOrganizationReceiptDraftValidator : AbstractValidator<UploadOrganizationReceiptDraftCommand>
{
	public UploadOrganizationReceiptDraftValidator()
	{
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.FileName).NotEmpty().MaximumLength(256);
		RuleFor(x => x.ContentType).NotEmpty().MaximumLength(128);
		RuleFor(x => x.FileSize).GreaterThan(0).LessThanOrEqualTo(20 * 1024 * 1024);
	}
}
