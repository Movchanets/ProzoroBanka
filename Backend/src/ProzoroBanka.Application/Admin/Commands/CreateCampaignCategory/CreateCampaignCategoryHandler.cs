using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Admin.Commands.CreateCampaignCategory;

public class CreateCampaignCategoryHandler : IRequestHandler<CreateCampaignCategoryCommand, ServiceResponse<AdminCampaignCategoryDto>>
{
	private readonly IApplicationDbContext _db;

	public CreateCampaignCategoryHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<AdminCampaignCategoryDto>> Handle(CreateCampaignCategoryCommand request, CancellationToken cancellationToken)
	{
		var slug = request.Slug.Trim().ToLowerInvariant();
		var exists = await _db.CampaignCategories.AsNoTracking().AnyAsync(c => c.Slug == slug, cancellationToken);
		if (exists)
			return ServiceResponse<AdminCampaignCategoryDto>.Failure("Категорія з таким slug вже існує");

		var entity = new CampaignCategory
		{
			NameUk = request.NameUk.Trim(),
			NameEn = request.NameEn.Trim(),
			Slug = slug,
			SortOrder = request.SortOrder,
			IsActive = request.IsActive
		};

		_db.CampaignCategories.Add(entity);
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<AdminCampaignCategoryDto>.Success(new AdminCampaignCategoryDto(
			entity.Id,
			entity.NameUk,
			entity.NameEn,
			entity.Slug,
			entity.SortOrder,
			entity.IsActive));
	}
}
