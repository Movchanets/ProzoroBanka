using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;

namespace ProzoroBanka.Application.Public.Queries.GetPublicCampaignCategories;

public record GetPublicCampaignCategoriesQuery : IRequest<ServiceResponse<IReadOnlyList<PublicCampaignCategoryDto>>>;

public class GetPublicCampaignCategoriesHandler
	: IRequestHandler<GetPublicCampaignCategoriesQuery, ServiceResponse<IReadOnlyList<PublicCampaignCategoryDto>>>
{
	private readonly IApplicationDbContext _db;

	public GetPublicCampaignCategoriesHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<IReadOnlyList<PublicCampaignCategoryDto>>> Handle(
		GetPublicCampaignCategoriesQuery request,
		CancellationToken cancellationToken)
	{
		var items = await _db.CampaignCategories
			.AsNoTracking()
			.Where(c => c.IsActive)
			.OrderBy(c => c.SortOrder)
			.ThenBy(c => c.NameUk)
			.Select(c => new PublicCampaignCategoryDto(
				c.Id,
				c.NameUk,
				c.NameEn,
				c.Slug))
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<PublicCampaignCategoryDto>>.Success(items);
	}
}
