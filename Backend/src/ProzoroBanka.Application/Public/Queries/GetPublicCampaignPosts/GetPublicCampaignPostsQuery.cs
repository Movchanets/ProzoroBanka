using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetPublicCampaignPosts;

public record GetPublicCampaignPostsQuery(Guid CampaignId)
	: IRequest<ServiceResponse<IReadOnlyList<PublicCampaignPostDto>>>;

public class GetPublicCampaignPostsHandler
	: IRequestHandler<GetPublicCampaignPostsQuery, ServiceResponse<IReadOnlyList<PublicCampaignPostDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicCampaignPostsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<PublicCampaignPostDto>>> Handle(
		GetPublicCampaignPostsQuery request,
		CancellationToken cancellationToken)
	{
		var exists = await _db.Campaigns
			.AsNoTracking()
			.AnyAsync(c => c.Id == request.CampaignId && c.Status != CampaignStatus.Draft, cancellationToken);

		if (!exists)
			return ServiceResponse<IReadOnlyList<PublicCampaignPostDto>>.Failure("Збір не знайдено");

		var posts = await _db.CampaignPosts
			.AsNoTracking()
			.Where(p => p.CampaignId == request.CampaignId)
			.OrderByDescending(p => p.CreatedAt)
			.Take(24)
			.Select(p => new PublicCampaignPostDto(
				p.Id,
				p.PostContentJson,
				p.Images.OrderBy(i => i.SortOrder)
					.Select(i => new PublicCampaignPostImageDto(
						i.Id,
						_fileStorage.GetPublicUrl(i.StorageKey),
						i.OriginalFileName,
						i.SortOrder))
					.ToList(),
				p.CreatedAt))
			.ToListAsync(cancellationToken);

		return ServiceResponse<IReadOnlyList<PublicCampaignPostDto>>.Success(posts);
	}
}
