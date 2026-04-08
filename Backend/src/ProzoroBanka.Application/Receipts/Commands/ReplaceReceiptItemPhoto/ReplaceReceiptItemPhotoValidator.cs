using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.ReplaceReceiptItemPhoto;

public class ReplaceReceiptItemPhotoValidator : AbstractValidator<ReplaceReceiptItemPhotoCommand>
{
    public ReplaceReceiptItemPhotoValidator()
    {
        RuleFor(x => x.CallerDomainUserId).NotEmpty();
        RuleFor(x => x.ReceiptId).NotEmpty();
        RuleFor(x => x.PhotoId).NotEmpty();
        RuleFor(x => x.File.FileName).NotEmpty();
    }
}
