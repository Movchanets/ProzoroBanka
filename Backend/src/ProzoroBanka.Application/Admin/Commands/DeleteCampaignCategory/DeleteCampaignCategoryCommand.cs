using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.DeleteCampaignCategory;

public record DeleteCampaignCategoryCommand(Guid CategoryId) : IRequest<ServiceResponse>;

public class DeleteCampaignCategoryHandler : IRequestHandler<DeleteCampaignCategoryCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public DeleteCampaignCategoryHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(DeleteCampaignCategoryCommand request, CancellationToken cancellationToken)
	{
		var category = await _db.CampaignCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId, cancellationToken);
		if (category is null)
			return ServiceResponse.Failure("Категорію не знайдено");

		var hasCampaignLinks = await _db.CampaignCategoryMappings
			.AsNoTracking()
			.AnyAsync(m => m.CategoryId == request.CategoryId, cancellationToken);

		if (hasCampaignLinks)
			return ServiceResponse.Failure("Категорія використовується у зборах і не може бути видалена");

		_db.CampaignCategories.Remove(category);
		await _db.SaveChangesAsync(cancellationToken);
		return ServiceResponse.Success("Категорію видалено");
	}
}
