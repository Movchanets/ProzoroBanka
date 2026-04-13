using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Queries.GetCampaignPosts;

public record GetCampaignPostsQuery(
	Guid CampaignId)
	: IRequest<ServiceResponse<IReadOnlyList<CampaignPostDto>>>;

public class GetCampaignPostsHandler : IRequestHandler<GetCampaignPostsQuery, ServiceResponse<IReadOnlyList<CampaignPostDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetCampaignPostsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<CampaignPostDto>>> Handle(GetCampaignPostsQuery request, CancellationToken cancellationToken)
	{
		var exists = await _db.Campaigns
			.AsNoTracking()
			.AnyAsync(c => c.Id == request.CampaignId, cancellationToken);
		if (!exists)
			return ServiceResponse<IReadOnlyList<CampaignPostDto>>.Failure("Збір не знайдено.");

		var posts = await _db.CampaignPosts
			.AsNoTracking()
			.Where(p => p.CampaignId == request.CampaignId)
			.OrderByDescending(p => p.CreatedAt)
			.Select(p => new CampaignPostDto(
				p.Id,
				p.PostContentJson,
				p.Images
					.OrderBy(i => i.SortOrder)
					.Select(i => new CampaignPostImageDto(
						i.Id,
						_fileStorage.GetPublicUrl(i.StorageKey),
						i.OriginalFileName,
						i.SortOrder))
					.ToList(),
				p.CreatedAt,
				p.UpdatedAt))
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<CampaignPostDto>>.Success(posts);
	}
}
