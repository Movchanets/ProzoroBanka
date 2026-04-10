using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.LinkReceiptItemPhoto;

public class LinkReceiptItemPhotoValidator : AbstractValidator<LinkReceiptItemPhotoCommand>
{
    public LinkReceiptItemPhotoValidator()
    {
        RuleFor(x => x.CallerDomainUserId).NotEmpty();
        RuleFor(x => x.ReceiptId).NotEmpty();
        RuleFor(x => x.PhotoId).NotEmpty();
    }
}
