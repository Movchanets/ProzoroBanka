using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.UpdateCampaign;

public class UpdateCampaignHandler : IRequestHandler<UpdateCampaignCommand, ServiceResponse<CampaignDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public UpdateCampaignHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignDto>> Handle(
		UpdateCampaignCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<CampaignDto>.Failure("Збір не знайдено");

		var hasPermission = await _orgAuth.HasPermission(
			campaign.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageCampaigns, cancellationToken);

		if (!hasPermission)
			return ServiceResponse<CampaignDto>.Failure("Недостатньо прав для редагування збору");

		if (request.Title is not null)
			campaign.Title = request.Title;

		if (request.Description is not null)
			campaign.Description = request.Description;

		if (request.GoalAmount.HasValue)
			campaign.GoalAmount = request.GoalAmount.Value;

		if (request.Deadline.HasValue)
			campaign.Deadline = request.Deadline.Value.ToUniversalTime();

		if (request.SendUrl is not null)
			campaign.SendUrl = string.IsNullOrWhiteSpace(request.SendUrl)
				? null
				: request.SendUrl.Trim();

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<CampaignDto>.Success(new CampaignDto(
			campaign.Id, campaign.Title, campaign.Description,
			StorageUrlResolver.Resolve(_fileStorage, campaign.CoverImageStorageKey),
			campaign.GoalAmount, campaign.CurrentAmount, 0, 0, 0,
			campaign.Status, campaign.StartDate, campaign.Deadline,
			campaign.MonobankAccountId, campaign.SendUrl, campaign.CreatedAt));
	}
}
