using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Queries.GetCampaignTransactions;

public record GetCampaignTransactionsQuery(
	Guid CallerDomainUserId,
	Guid CampaignId,
	int Page,
	int PageSize) : IRequest<ServiceResponse<IReadOnlyList<CampaignTransactionDto>>>;

public class GetCampaignTransactionsQueryValidator : AbstractValidator<GetCampaignTransactionsQuery>
{
	public GetCampaignTransactionsQueryValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
		RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
	}
}
