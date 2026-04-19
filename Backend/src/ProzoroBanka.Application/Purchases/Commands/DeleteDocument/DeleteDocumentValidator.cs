using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.DeleteDocument;

public class DeleteDocumentValidator : AbstractValidator<DeleteDocumentCommand>
{
	public DeleteDocumentValidator()
	{
		RuleFor(x => x.OrganizationId)
			.NotEmpty().WithMessage("OrganizationId обов'язковий");

		RuleFor(x => x.CampaignId)
			.NotEmpty().WithMessage("CampaignId обов'язковий");

		RuleFor(x => x.PurchaseId)
			.NotEmpty().WithMessage("PurchaseId обов'язковий");

		RuleFor(x => x.DocumentId)
			.NotEmpty().WithMessage("DocumentId обов'язковий");
	}
}
