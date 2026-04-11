using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Queries.GetOrganizationReceipts;

public record GetOrganizationReceiptsQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	string? Search = null,
	ReceiptStatus? Status = null,
	bool OnlyUnattached = false) : IRequest<ServiceResponse<IReadOnlyList<ReceiptListItemDto>>>;

public class GetOrganizationReceiptsHandler
	: IRequestHandler<GetOrganizationReceiptsQuery, ServiceResponse<IReadOnlyList<ReceiptListItemDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetOrganizationReceiptsHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<IReadOnlyList<ReceiptListItemDto>>> Handle(
		GetOrganizationReceiptsQuery request,
		CancellationToken cancellationToken)
	{
		var isMember = await _orgAuth.IsMember(request.OrganizationId, request.CallerDomainUserId, cancellationToken);
		if (!isMember)
			return ServiceResponse<IReadOnlyList<ReceiptListItemDto>>.Failure("Немає доступу до організації");

		var query = _db.Receipts
			.AsNoTracking()
			.Where(r => r.OrganizationId == request.OrganizationId)
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
				($"{r.User.FirstName} {r.User.LastName}").Trim(),
				r.User.Email,
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
