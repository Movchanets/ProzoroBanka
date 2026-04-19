using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.UpdateDocumentMetadata;

public class UpdateDocumentMetadataValidator : AbstractValidator<UpdateDocumentMetadataCommand>
{
	public UpdateDocumentMetadataValidator()
	{
		RuleFor(x => x.OrganizationId)
			.NotEmpty().WithMessage("OrganizationId обов'язковий");

		RuleFor(x => x.CampaignId)
			.NotEmpty().WithMessage("CampaignId обов'язковий");

		RuleFor(x => x.PurchaseId)
			.NotEmpty().WithMessage("PurchaseId обов'язковий");

		RuleFor(x => x.DocumentId)
			.NotEmpty().WithMessage("DocumentId обов'язковий");

		RuleFor(x => x.Amount)
			.GreaterThan(0).WithMessage("Сума має бути більше 0")
			.When(x => x.Amount.HasValue);

		RuleFor(x => x.CounterpartyName)
			.MaximumLength(500).WithMessage("Назва контрагента не може перевищувати 500 символів")
			.When(x => x.CounterpartyName is not null);

		RuleFor(x => x)
			.Must(x => x.Amount.HasValue || x.CounterpartyName is not null || x.DocumentDate.HasValue)
			.WithMessage("Потрібно передати хоча б одне поле для оновлення");
	}
}
