using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Queries.GetMyReceipt;

public class GetMyReceiptHandler : IRequestHandler<GetMyReceiptQuery, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;

	public GetMyReceiptHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(GetMyReceiptQuery request, CancellationToken ct)
	{
		var receipt = await _db.Receipts
			.AsNoTracking()
			.Where(r => r.Id == request.ReceiptId && r.UserId == request.CallerDomainUserId)
			.Select(r => new ReceiptPipelineDto(
				r.Id,
				r.OriginalFileName,
				r.MerchantName,
				r.TotalAmount,
				r.PurchaseDateUtc,
				r.Status,
				r.PublicationStatus,
				r.VerificationFailureReason,
				r.CreatedAt,
				r.FiscalNumber,
				r.ReceiptCode,
				r.Currency,
				r.PurchasedItemName,
				r.OcrStructuredPayloadJson,
				r.RawOcrJson))
			.FirstOrDefaultAsync(ct);

		return receipt is null
			? ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено")
			: ServiceResponse<ReceiptPipelineDto>.Success(receipt);
	}
}
