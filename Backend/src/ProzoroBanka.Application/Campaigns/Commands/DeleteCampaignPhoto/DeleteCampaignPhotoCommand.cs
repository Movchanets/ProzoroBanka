using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.DeleteCampaignPhoto;

public record DeleteCampaignPhotoCommand(
	Guid DomainUserId,
	Guid CampaignId,
	Guid PhotoId) : IRequest<ServiceResponse<Unit>>;

public class DeleteCampaignPhotoHandler : IRequestHandler<DeleteCampaignPhotoCommand, ServiceResponse<Unit>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public DeleteCampaignPhotoHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<Unit>> Handle(
		DeleteCampaignPhotoCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.Include(c => c.Organization)
			.ThenInclude(o => o.Members)
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<Unit>.Failure("Збір не знайдено.");

		var member = campaign.Organization.Members.FirstOrDefault(m => m.UserId == request.DomainUserId);
		if (member is null)
			return ServiceResponse<Unit>.Failure("Недостатньо прав для видалення фото.");

		var photo = await _db.CampaignPhotos
			.FirstOrDefaultAsync(p => p.Id == request.PhotoId && p.CampaignId == request.CampaignId, cancellationToken);

		if (photo is null)
			return ServiceResponse<Unit>.Failure("Фото не знайдено.");

		await _fileStorage.DeleteAsync(photo.StorageKey, cancellationToken);

		_db.CampaignPhotos.Remove(photo);
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<Unit>.Success(Unit.Value);
	}
}
