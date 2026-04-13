using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.DeleteCampaignPost;

public record DeleteCampaignPostCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	Guid PostId)
	: IRequest<ServiceResponse<Unit>>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns];
}

public class DeleteCampaignPostHandler : IRequestHandler<DeleteCampaignPostCommand, ServiceResponse<Unit>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public DeleteCampaignPostHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<Unit>> Handle(DeleteCampaignPostCommand request, CancellationToken cancellationToken)
	{
		var post = await _db.CampaignPosts
			.Include(p => p.Campaign)
				.ThenInclude(c => c.Organization)
				.ThenInclude(o => o.Members)
			.Include(p => p.Images)
			.FirstOrDefaultAsync(p => p.Id == request.PostId && p.CampaignId == request.CampaignId, cancellationToken);

		if (post is null)
			return ServiceResponse<Unit>.Failure("Пост не знайдено.");

		var member = post.Campaign.Organization.Members.FirstOrDefault(m => m.UserId == request.CallerDomainUserId);
		if (member is null)
			return ServiceResponse<Unit>.Failure("Недостатньо прав для видалення поста.");

		post.IsDeleted = true;
		foreach (var image in post.Images)
		{
			image.IsDeleted = true;
			await _fileStorage.DeleteAsync(image.StorageKey, cancellationToken);
		}

		await _db.SaveChangesAsync(cancellationToken);
		return ServiceResponse<Unit>.Success(Unit.Value);
	}
}
