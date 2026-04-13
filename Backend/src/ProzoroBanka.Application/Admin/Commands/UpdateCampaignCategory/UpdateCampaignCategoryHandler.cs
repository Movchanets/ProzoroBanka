using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.UpdateCampaignCategory;

public class UpdateCampaignCategoryHandler : IRequestHandler<UpdateCampaignCategoryCommand, ServiceResponse<AdminCampaignCategoryDto>>
{
	private readonly IApplicationDbContext _db;

	public UpdateCampaignCategoryHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<AdminCampaignCategoryDto>> Handle(UpdateCampaignCategoryCommand request, CancellationToken cancellationToken)
	{
		var category = await _db.CampaignCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId, cancellationToken);
		if (category is null)
			return ServiceResponse<AdminCampaignCategoryDto>.Failure("Категорію не знайдено");

		var slug = request.Slug.Trim().ToLowerInvariant();
		var slugTaken = await _db.CampaignCategories.AsNoTracking().AnyAsync(c => c.Id != request.CategoryId && c.Slug == slug, cancellationToken);
		if (slugTaken)
			return ServiceResponse<AdminCampaignCategoryDto>.Failure("Категорія з таким slug вже існує");

		category.NameUk = request.NameUk.Trim();
		category.NameEn = request.NameEn.Trim();
		category.Slug = slug;
		category.SortOrder = request.SortOrder;
		category.IsActive = request.IsActive;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<AdminCampaignCategoryDto>.Success(new AdminCampaignCategoryDto(
			category.Id,
			category.NameUk,
			category.NameEn,
			category.Slug,
			category.SortOrder,
			category.IsActive));
	}
}
