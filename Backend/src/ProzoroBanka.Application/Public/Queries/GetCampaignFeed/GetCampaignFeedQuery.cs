using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetCampaignFeed;

public record GetCampaignFeedQuery(
	Guid CampaignId,
	int Page = 1,
	int PageSize = 20)
	: IRequest<ServiceResponse<PublicListResponse<CampaignFeedItemDto>>>;

public class GetCampaignFeedHandler
	: IRequestHandler<GetCampaignFeedQuery, ServiceResponse<PublicListResponse<CampaignFeedItemDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetCampaignFeedHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicListResponse<CampaignFeedItemDto>>> Handle(
		GetCampaignFeedQuery request,
		CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.Where(c => c.Id == request.CampaignId && c.Status != CampaignStatus.Draft)
			.Select(c => new { c.Id, c.TitleUk })
			.FirstOrDefaultAsync(cancellationToken);

		if (campaign is null)
			return ServiceResponse<PublicListResponse<CampaignFeedItemDto>>.Failure("Збір не знайдено");

		var campaignId = campaign.Id;
		var campaignTitle = campaign.TitleUk;

		var posts = await _db.CampaignPosts
			.AsNoTracking()
			.Where(p => p.CampaignId == campaignId)
			.OrderByDescending(p => p.CreatedAt)
			.Select(p => new
			{
				p.Id,
				p.PostContentJson,
				p.CreatedAt,
				CreatedByName = p.CreatedBy.FirstName + " " + p.CreatedBy.LastName,
				Images = p.Images
					.OrderBy(i => i.SortOrder)
					.Select(i => new { i.Id, i.StorageKey, i.OriginalFileName, i.SortOrder })
					.ToList()
			})
			.ToListAsync(cancellationToken);

		var postDtos = posts.Select(p => new CampaignFeedItemDto(
			"post", p.Id, p.CreatedAt,
			campaignId, campaignTitle,
			null, null, null, null, null,
			p.PostContentJson,
			p.Images.Select(i => new PublicCampaignPostImageDto(
				i.Id, _fileStorage.GetPublicUrl(i.StorageKey), i.OriginalFileName, i.SortOrder)).ToList(),
			p.CreatedByName, p.CreatedAt)).ToList();

		var purchasesRaw = await _db.CampaignPurchases
			.AsNoTracking()
			.Where(p => p.CampaignId == campaignId && p.Status != PurchaseStatus.Cancelled)
			.OrderByDescending(p => p.CreatedAt)
			.Select(p => new
			{
				p.Id, p.Title, p.Description, p.TotalAmount, p.CreatedAt,
				CreatedByName = p.CreatedBy.FirstName + " " + p.CreatedBy.LastName
			})
			.ToListAsync(cancellationToken);

		var purchaseDtos = purchasesRaw.Select(p => new CampaignFeedItemDto(
			"purchase", p.Id, p.CreatedAt,
			campaignId, campaignTitle,
			p.Id, p.Title, p.Description,
			MoneyConversion.ToUah(p.TotalAmount),
			null, null, null,
			p.CreatedByName, p.CreatedAt)).ToList();

		var transactionsRaw = await _db.CampaignTransactions
			.AsNoTracking()
			.Where(t => t.CampaignId == campaignId)
			.OrderByDescending(t => t.TransactionTimeUtc)
			.Select(t => new
			{
				t.Id, t.Amount, t.Description, t.TransactionTimeUtc, t.Source, t.CreatedAt
			})
			.ToListAsync(cancellationToken);

		var transactionDtos = transactionsRaw.Select(t => new CampaignFeedItemDto(
			"transaction", t.Id, t.TransactionTimeUtc,
			campaignId, campaignTitle,
			null, null, t.Description,
			MoneyConversion.ToUah(t.Amount),
			t.Source.ToString(), null, null,
			null, t.CreatedAt)).ToList();

		var allItems = postDtos.Concat(purchaseDtos).Concat(transactionDtos)
			.OrderByDescending(i => i.EventDate).ToList();

		var totalCount = allItems.Count;
		var page = Math.Max(1, request.Page);
		var pageSize = Math.Clamp(request.PageSize, 1, 100);
		var items = allItems.Skip((page - 1) * pageSize).Take(pageSize).ToList();

		return ServiceResponse<PublicListResponse<CampaignFeedItemDto>>.Success(
			new PublicListResponse<CampaignFeedItemDto>(items, page, pageSize, totalCount));
	}
}
