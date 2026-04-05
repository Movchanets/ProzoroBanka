using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetPublicCampaignReceipts;

public record GetPublicCampaignReceiptsQuery(
	Guid CampaignId,
	int Page = 1,
	int PageSize = 20) : IRequest<ServiceResponse<PublicListResponse<PublicReceiptDto>>>;

public class GetPublicCampaignReceiptsHandler
	: IRequestHandler<GetPublicCampaignReceiptsQuery, ServiceResponse<PublicListResponse<PublicReceiptDto>>>
{
	private readonly IApplicationDbContext _db;

	public GetPublicCampaignReceiptsHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<PublicListResponse<PublicReceiptDto>>> Handle(
		GetPublicCampaignReceiptsQuery request,
		CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.Where(c => c.Id == request.CampaignId && c.Status != CampaignStatus.Draft)
			.Select(c => new { c.Id })
			.FirstOrDefaultAsync(cancellationToken);

		if (campaign is null)
			return ServiceResponse<PublicListResponse<PublicReceiptDto>>.Failure("Збір не знайдено");

		var page = Math.Max(1, request.Page);
		var pageSize = Math.Clamp(request.PageSize, 1, 50);

		var receiptsQuery = _db.Receipts
			.AsNoTracking()
			.Where(r => r.CampaignId == campaign.Id
				&& r.Status == ReceiptStatus.StateVerified
				&& r.PublicationStatus == ReceiptPublicationStatus.Active)
			.AsQueryable();

		var totalCount = await receiptsQuery.CountAsync(cancellationToken);
		var items = await receiptsQuery
			.OrderByDescending(r => r.TransactionDate ?? r.CreatedAt)
			.Skip((page - 1) * pageSize)
			.Take(pageSize)
			.Select(r => new PublicReceiptDto(
				r.Id,
				r.MerchantName,
				r.TotalAmount,
				r.TransactionDate,
				r.User.FirstName + " " + r.User.LastName))
			.ToListAsync(cancellationToken);

		return ServiceResponse<PublicListResponse<PublicReceiptDto>>.Success(
			new PublicListResponse<PublicReceiptDto>(items, page, pageSize, totalCount));
	}
}
