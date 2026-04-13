using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using System.IO;

namespace ProzoroBanka.Application.Campaigns.Commands.AddCampaignPhotos;

public record AddCampaignPhotosCommand(
	Guid DomainUserId,
	Guid CampaignId,
	Stream FileStream,
	string OriginalFileName,
	string ContentType,
	string? Description) : IRequest<ServiceResponse<CampaignPhotoDto>>;

public class AddCampaignPhotosHandler : IRequestHandler<AddCampaignPhotosCommand, ServiceResponse<CampaignPhotoDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public AddCampaignPhotosHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignPhotoDto>> Handle(
		AddCampaignPhotosCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.Include(c => c.Organization)
			.ThenInclude(o => o.Members)
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<CampaignPhotoDto>.Failure("Збір не знайдено.");

		var member = campaign.Organization.Members.FirstOrDefault(m => m.UserId == request.DomainUserId);
		if (member is null)
			return ServiceResponse<CampaignPhotoDto>.Failure("Недостатньо прав для додавання фото.");

		var maxSortOrder = await _db.CampaignPhotos
			.Where(p => p.CampaignId == request.CampaignId)
			.MaxAsync(p => (int?)p.SortOrder, cancellationToken) ?? -1;

		var storageKey = await _fileStorage.UploadAsync(request.FileStream, request.OriginalFileName, request.ContentType, cancellationToken);
		if (string.IsNullOrEmpty(storageKey))
			return ServiceResponse<CampaignPhotoDto>.Failure("Помилка завантаження файлу.");

		var photo = new CampaignPhoto
		{
			CampaignId = request.CampaignId,
			CreatedByUserId = request.DomainUserId,
			StorageKey = storageKey,
			OriginalFileName = request.OriginalFileName,
			Description = request.Description,
			SortOrder = maxSortOrder + 1
		};

		_db.CampaignPhotos.Add(photo);
		await _db.SaveChangesAsync(cancellationToken);

		var dto = new CampaignPhotoDto(
			photo.Id,
			_fileStorage.GetPublicUrl(photo.StorageKey),
			photo.OriginalFileName,
			photo.Description,
			campaign.CoverImageStorageKey == photo.StorageKey,
			photo.SortOrder,
			photo.CreatedAt);

		return ServiceResponse<CampaignPhotoDto>.Success(dto);
	}
}
