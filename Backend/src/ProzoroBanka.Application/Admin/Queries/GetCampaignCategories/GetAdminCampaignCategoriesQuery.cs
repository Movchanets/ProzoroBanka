using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetCampaignCategories;

public record GetAdminCampaignCategoriesQuery(bool IncludeInactive = true)
	: IRequest<ServiceResponse<IReadOnlyList<AdminCampaignCategoryDto>>>;

public class GetAdminCampaignCategoriesHandler
	: IRequestHandler<GetAdminCampaignCategoriesQuery, ServiceResponse<IReadOnlyList<AdminCampaignCategoryDto>>>
{
	private readonly IApplicationDbContext _db;

	public GetAdminCampaignCategoriesHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<IReadOnlyList<AdminCampaignCategoryDto>>> Handle(
		GetAdminCampaignCategoriesQuery request,
		CancellationToken cancellationToken)
	{
		var query = _db.CampaignCategories.AsNoTracking().AsQueryable();

		if (!request.IncludeInactive)
			query = query.Where(c => c.IsActive);

		var items = await query
			.OrderBy(c => c.SortOrder)
			.ThenBy(c => c.NameUk)
			.Select(c => new AdminCampaignCategoryDto(
				c.Id,
				c.NameUk,
				c.NameEn,
				c.Slug,
				c.SortOrder,
				c.IsActive))
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<AdminCampaignCategoryDto>>.Success(items);
	}
}
