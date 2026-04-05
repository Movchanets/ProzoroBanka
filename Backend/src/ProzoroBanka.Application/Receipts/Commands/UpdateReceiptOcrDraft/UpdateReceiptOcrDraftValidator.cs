using System.Text.Json;
using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.UpdateReceiptOcrDraft;

public class UpdateReceiptOcrDraftValidator : AbstractValidator<UpdateReceiptOcrDraftCommand>
{
	public UpdateReceiptOcrDraftValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.ReceiptId).NotEmpty();
		RuleFor(x => x.MerchantName).MaximumLength(256);
		RuleFor(x => x.FiscalNumber).MaximumLength(128);
		RuleFor(x => x.ReceiptCode).MaximumLength(128);
		RuleFor(x => x.Currency).MaximumLength(16);
		RuleFor(x => x.PurchasedItemName).MaximumLength(512);
		RuleFor(x => x.TotalAmount)
			.GreaterThanOrEqualTo(0)
			.When(x => x.TotalAmount.HasValue);
		RuleFor(x => x.OcrStructuredPayloadJson)
			.Must(BeValidJson)
			.When(x => !string.IsNullOrWhiteSpace(x.OcrStructuredPayloadJson))
			.WithMessage("OcrStructuredPayloadJson має бути валідним JSON");
	}

	private static bool BeValidJson(string? json)
	{
		if (string.IsNullOrWhiteSpace(json))
			return true;

		try
		{
			using var _ = JsonDocument.Parse(json);
			return true;
		}
		catch (JsonException)
		{
			return false;
		}
	}
}
