using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.DeleteReceiptItemPhoto;

public class DeleteReceiptItemPhotoValidator : AbstractValidator<DeleteReceiptItemPhotoCommand>
{
    public DeleteReceiptItemPhotoValidator()
    {
        RuleFor(x => x.CallerDomainUserId).NotEmpty();
        RuleFor(x => x.ReceiptId).NotEmpty();
        RuleFor(x => x.PhotoId).NotEmpty();
    }
}
