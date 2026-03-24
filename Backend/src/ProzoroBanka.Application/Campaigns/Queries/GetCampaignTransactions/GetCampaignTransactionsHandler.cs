using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Queries.GetCampaignTransactions;

public class GetCampaignTransactionsHandler
	: IRequestHandler<GetCampaignTransactionsQuery, ServiceResponse<IReadOnlyList<CampaignTransactionDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public GetCampaignTransactionsHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<IReadOnlyList<CampaignTransactionDto>>> Handle(
		GetCampaignTransactionsQuery request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.AsNoTracking()
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<IReadOnlyList<CampaignTransactionDto>>.Failure("Збір не знайдено");

		var isMember = await _orgAuth.IsMember(
			campaign.OrganizationId, request.CallerDomainUserId, cancellationToken);

		if (!isMember)
			return ServiceResponse<IReadOnlyList<CampaignTransactionDto>>.Failure("Недостатньо прав для перегляду транзакцій");

		var transactions = await _db.CampaignTransactions
			.AsNoTracking()
			.Where(t => t.CampaignId == request.CampaignId)
			.OrderByDescending(t => t.TransactionTimeUtc)
			.Skip((request.Page - 1) * request.PageSize)
			.Take(request.PageSize)
			.Select(t => new CampaignTransactionDto(
				t.Id,
				t.Amount,
				t.Description,
				t.TransactionTimeUtc,
				t.Source.ToString(),
				t.CreatedAt))
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<CampaignTransactionDto>>.Success(transactions);
	}
}
