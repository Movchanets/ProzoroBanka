using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.ReorderCampaignPhotos;

public record ReorderCampaignPhotosCommand(
	Guid DomainUserId,
	Guid CampaignId,
	List<Guid> PhotoIds) : IRequest<ServiceResponse<Unit>>;

public class ReorderCampaignPhotosHandler : IRequestHandler<ReorderCampaignPhotosCommand, ServiceResponse<Unit>>
{
	private readonly IApplicationDbContext _db;

	public ReorderCampaignPhotosHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<Unit>> Handle(
		ReorderCampaignPhotosCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.Include(c => c.Organization)
			.ThenInclude(o => o.Members)
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<Unit>.Failure("Збір не знайдено.");

		var member = campaign.Organization.Members.FirstOrDefault(m => m.UserId == request.DomainUserId);
		if (member is null)
			return ServiceResponse<Unit>.Failure("Недостатньо прав для змінення фото.");

		var photos = await _db.CampaignPhotos
			.Where(p => p.CampaignId == request.CampaignId)
			.ToListAsync(cancellationToken);

		for (int i = 0; i < request.PhotoIds.Count; i++)
		{
			var photoId = request.PhotoIds[i];
			var photo = photos.FirstOrDefault(p => p.Id == photoId);
			if (photo is not null)
			{
				photo.SortOrder = i;
			}
		}

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<Unit>.Success(Unit.Value);
	}
}
