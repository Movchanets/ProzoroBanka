using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Queries.GetMyReceipts;

public record GetMyReceiptsQuery(
	Guid CallerDomainUserId,
	string? Search = null,
	ReceiptStatus? Status = null,
	bool OnlyUnattached = false) : IRequest<ServiceResponse<IReadOnlyList<ReceiptListItemDto>>>;

public class GetMyReceiptsHandler
	: IRequestHandler<GetMyReceiptsQuery, ServiceResponse<IReadOnlyList<ReceiptListItemDto>>>
{
	private readonly IApplicationDbContext _db;

	public GetMyReceiptsHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<IReadOnlyList<ReceiptListItemDto>>> Handle(
		GetMyReceiptsQuery request,
		CancellationToken cancellationToken)
	{
		var query = _db.Receipts
			.AsNoTracking()
			.Where(r => r.UserId == request.CallerDomainUserId)
			.AsQueryable();

		if (request.Status.HasValue)
			query = query.Where(r => r.Status == request.Status.Value);

		if (request.OnlyUnattached)
			query = query.Where(r => r.CampaignId == null);

		var search = request.Search?.Trim();
		if (!string.IsNullOrWhiteSpace(search))
		{
			var normalizedSearch = search.ToLowerInvariant();
			var pattern = $"%{normalizedSearch}%";
			query = query.Where(r =>
				(r.Alias != null && EF.Functions.Like(r.Alias.ToLower(), pattern))
				|| (r.MerchantName != null && EF.Functions.Like(r.MerchantName.ToLower(), pattern))
				|| EF.Functions.Like(r.OriginalFileName.ToLower(), pattern)
				|| (r.PurchasedItemName != null && EF.Functions.Like(r.PurchasedItemName.ToLower(), pattern)));
		}

		var receipts = await query
			.OrderByDescending(r => r.CreatedAt)
			.Select(r => new ReceiptListItemDto(
				r.Id,
				r.OriginalFileName,
				r.Alias,
				r.MerchantName,
				r.TotalAmount,
				r.PurchaseDateUtc,
				r.Status,
				r.PublicationStatus,
				r.CampaignId,
				r.Campaign != null ? r.Campaign.Title : null,
				r.CreatedAt))
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<ReceiptListItemDto>>.Success(receipts);
	}
}
