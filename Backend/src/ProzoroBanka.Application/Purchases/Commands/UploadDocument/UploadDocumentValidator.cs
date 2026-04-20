using FluentValidation;

namespace ProzoroBanka.Application.Purchases.Commands.UploadDocument;

public class UploadDocumentValidator : AbstractValidator<UploadDocumentCommand>
{
	public UploadDocumentValidator()
	{
		RuleFor(x => x.FileName)
			.NotEmpty().WithMessage("Ім'я файлу обов'язкове");

		RuleFor(x => x.Type)
			.IsInEnum().WithMessage("Невірний тип документа");

		RuleFor(x => x.PurchaseId)
			.NotEmpty().WithMessage("PurchaseId обов'язковий");
	}
}
