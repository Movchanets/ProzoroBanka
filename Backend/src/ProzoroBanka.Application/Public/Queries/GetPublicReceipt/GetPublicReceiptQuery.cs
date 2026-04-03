using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetPublicReceipt;

public record GetPublicReceiptQuery(Guid ReceiptId) : IRequest<ServiceResponse<PublicReceiptDetailDto>>;

public class GetPublicReceiptHandler : IRequestHandler<GetPublicReceiptQuery, ServiceResponse<PublicReceiptDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicReceiptHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicReceiptDetailDto>> Handle(
		GetPublicReceiptQuery request,
		CancellationToken cancellationToken)
	{
		var receipt = await _db.Receipts
			.AsNoTracking()
			.Where(r => r.Id == request.ReceiptId && r.Status == ReceiptStatus.StateVerified)
			.Select(r => new
			{
				r.Id,
				r.MerchantName,
				r.TotalAmount,
				r.TransactionDate,
				r.Status,
				r.StorageKey,
				r.RawOcrJson,
				AddedByName = r.User.FirstName + " " + r.User.LastName
			})
			.FirstOrDefaultAsync(cancellationToken);

		if (receipt is null)
			return ServiceResponse<PublicReceiptDetailDto>.Failure("Чек не знайдено");

		return ServiceResponse<PublicReceiptDetailDto>.Success(new PublicReceiptDetailDto(
			receipt.Id,
			receipt.MerchantName,
			receipt.TotalAmount,
			receipt.TransactionDate,
			receipt.Status.ToString(),
			StorageUrlResolver.Resolve(_fileStorage, receipt.StorageKey) ?? string.Empty,
			receipt.RawOcrJson,
			receipt.AddedByName,
			null,
			null,
			null,
			null));
	}
}
