using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.ImportReceiptTaxXml;

public class ImportReceiptTaxXmlValidator : AbstractValidator<ImportReceiptTaxXmlCommand>
{
    public ImportReceiptTaxXmlValidator()
    {
        RuleFor(x => x.CallerDomainUserId).NotEmpty();
        RuleFor(x => x.ReceiptId).NotEmpty();
        RuleFor(x => x.XmlStream).NotNull();
    }
}
