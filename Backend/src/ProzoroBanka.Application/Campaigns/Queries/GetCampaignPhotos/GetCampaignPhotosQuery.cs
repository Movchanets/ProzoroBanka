using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Queries.GetCampaignPhotos;

public record GetCampaignPhotosQuery(
	Guid CampaignId) : IRequest<ServiceResponse<IReadOnlyList<CampaignPhotoDto>>>;

public class GetCampaignPhotosHandler : IRequestHandler<GetCampaignPhotosQuery, ServiceResponse<IReadOnlyList<CampaignPhotoDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetCampaignPhotosHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<CampaignPhotoDto>>> Handle(
		GetCampaignPhotosQuery request, CancellationToken cancellationToken)
	{
		var campaignExists = await _db.Campaigns.AnyAsync(c => c.Id == request.CampaignId, cancellationToken);
		if (!campaignExists)
			return ServiceResponse<IReadOnlyList<CampaignPhotoDto>>.Failure("Збір не знайдено.");

		var photos = await _db.CampaignPhotos
			.AsNoTracking()
			.Where(p => p.CampaignId == request.CampaignId)
			.OrderBy(p => p.SortOrder)
			.ToListAsync(cancellationToken);

		var dtos = photos.Select(p => new CampaignPhotoDto(
			p.Id,
			_fileStorage.GetPublicUrl(p.StorageKey),
			p.OriginalFileName,
			p.Description,
			p.SortOrder,
			p.CreatedAt)).ToList();

		return ServiceResponse<IReadOnlyList<CampaignPhotoDto>>.Success(dtos);
	}
}
