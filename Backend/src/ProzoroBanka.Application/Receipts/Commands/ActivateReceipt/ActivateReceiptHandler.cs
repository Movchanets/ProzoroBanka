using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.ActivateReceipt;

public class ActivateReceiptHandler : IRequestHandler<ActivateReceiptCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;

	public ActivateReceiptHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ActivateReceiptCommand request, CancellationToken ct)
	{
		var receipt = await _db.Receipts.FirstOrDefaultAsync(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId, ct);
		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		if (receipt.Status != ReceiptStatus.StateVerified)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Активувати можна тільки чек зі статусом StateVerified");

		receipt.PublicationStatus = ReceiptPublicationStatus.Active;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(new ReceiptPipelineDto(
			receipt.Id,
			receipt.OriginalFileName,
			receipt.MerchantName,
			receipt.TotalAmount,
			receipt.PurchaseDateUtc,
			receipt.Status,
			receipt.PublicationStatus,
			receipt.VerificationFailureReason,
			receipt.CreatedAt));
	}
}
