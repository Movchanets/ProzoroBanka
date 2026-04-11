using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.UpdateCampaignPhoto;

public record UpdateCampaignPhotoCommand(
	Guid DomainUserId,
	Guid CampaignId,
	Guid PhotoId,
	string? Description) : IRequest<ServiceResponse<CampaignPhotoDto>>;

public class UpdateCampaignPhotoHandler : IRequestHandler<UpdateCampaignPhotoCommand, ServiceResponse<CampaignPhotoDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public UpdateCampaignPhotoHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignPhotoDto>> Handle(
		UpdateCampaignPhotoCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.Include(c => c.Organization)
			.ThenInclude(o => o.Members)
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<CampaignPhotoDto>.Failure("Збір не знайдено.");

		var member = campaign.Organization.Members.FirstOrDefault(m => m.UserId == request.DomainUserId);
		if (member is null)
			return ServiceResponse<CampaignPhotoDto>.Failure("Недостатньо прав для оновлення фото.");

		var photo = await _db.CampaignPhotos
			.FirstOrDefaultAsync(p => p.Id == request.PhotoId && p.CampaignId == request.CampaignId, cancellationToken);

		if (photo is null)
			return ServiceResponse<CampaignPhotoDto>.Failure("Фото не знайдено.");

		photo.Description = request.Description;

		await _db.SaveChangesAsync(cancellationToken);

		var dto = new CampaignPhotoDto(
			photo.Id,
			_fileStorage.GetPublicUrl(photo.StorageKey),
			photo.OriginalFileName,
			photo.Description,
			photo.SortOrder,
			photo.CreatedAt);

		return ServiceResponse<CampaignPhotoDto>.Success(dto);
	}
}
