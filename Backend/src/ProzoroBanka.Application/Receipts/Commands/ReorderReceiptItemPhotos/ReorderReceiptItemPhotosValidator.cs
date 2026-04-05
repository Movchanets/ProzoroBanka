using FluentValidation;

namespace ProzoroBanka.Application.Receipts.Commands.ReorderReceiptItemPhotos;

public class ReorderReceiptItemPhotosValidator : AbstractValidator<ReorderReceiptItemPhotosCommand>
{
    public ReorderReceiptItemPhotosValidator()
    {
        RuleFor(x => x.CallerDomainUserId).NotEmpty();
        RuleFor(x => x.ReceiptId).NotEmpty();
        RuleFor(x => x.PhotoIds).NotEmpty();
    }
}
