using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.UploadCampaignCover;

public class UploadCampaignCoverHandler : IRequestHandler<UploadCampaignCoverCommand, ServiceResponse<CampaignDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public UploadCampaignCoverHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignDto>> Handle(
		UploadCampaignCoverCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<CampaignDto>.Failure("Збір не знайдено");

		var hasPermission = await _orgAuth.HasPermission(
			campaign.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageCampaigns, cancellationToken);

		if (!hasPermission)
			return ServiceResponse<CampaignDto>.Failure("Недостатньо прав для завантаження обкладинки");

		// Видалити стару обкладинку якщо існує
		if (!string.IsNullOrWhiteSpace(campaign.CoverImageStorageKey))
		{
			await _fileStorage.DeleteAsync(campaign.CoverImageStorageKey, cancellationToken);
		}

		var storageKey = await _fileStorage.UploadAsync(
			request.FileStream, request.FileName, request.ContentType, cancellationToken);

		campaign.CoverImageStorageKey = storageKey;
		await _db.SaveChangesAsync(cancellationToken);

		var categories = await _db.CampaignCategoryMappings
			.AsNoTracking()
			.Where(m => m.CampaignId == campaign.Id)
			.OrderBy(m => m.Category.SortOrder)
			.ThenBy(m => m.Category.NameUk)
			.Select(m => new CampaignCategoryDto(
				m.Category.Id,
				m.Category.NameUk,
				m.Category.NameEn,
				m.Category.Slug,
				m.Category.SortOrder,
				m.Category.IsActive))
			.ToListAsync(cancellationToken);

		return ServiceResponse<CampaignDto>.Success(new CampaignDto(
			campaign.Id, campaign.TitleUk, campaign.TitleEn, campaign.Description,
			_fileStorage.ResolvePublicUrl(campaign.CoverImageStorageKey),
			campaign.GoalAmount, campaign.CurrentAmount, 0, 0, 0,
			campaign.Status, campaign.StartDate, campaign.Deadline,
			campaign.MonobankAccountId, campaign.SendUrl, categories, 0, campaign.CreatedAt));
	}
}
