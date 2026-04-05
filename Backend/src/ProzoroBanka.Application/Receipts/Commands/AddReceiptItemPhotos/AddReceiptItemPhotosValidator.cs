using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.AddReceiptItemPhotos;

public class AddReceiptItemPhotosValidator : AbstractValidator<AddReceiptItemPhotosCommand>
{
    public AddReceiptItemPhotosValidator()
    {
        RuleFor(x => x.CallerDomainUserId).NotEmpty();
        RuleFor(x => x.ReceiptId).NotEmpty();
        RuleFor(x => x.Files).NotEmpty();
    }
}
