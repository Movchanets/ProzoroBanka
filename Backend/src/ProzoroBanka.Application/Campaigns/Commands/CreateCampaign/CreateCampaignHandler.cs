using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Campaigns.Commands.CreateCampaign;

public class CreateCampaignHandler : IRequestHandler<CreateCampaignCommand, ServiceResponse<CampaignDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IOrganizationPlanLimitService _planLimitService;
	private readonly IFileStorage _fileStorage;

	public CreateCampaignHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IOrganizationPlanLimitService planLimitService,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_planLimitService = planLimitService;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignDto>> Handle(
		CreateCampaignCommand request, CancellationToken cancellationToken)
	{
		var orgExists = await _db.Organizations
			.AnyAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (!orgExists)
			return ServiceResponse<CampaignDto>.Failure("Організацію не знайдено");

		var hasPermission = await _orgAuth.HasPermission(
			request.OrganizationId, request.CallerDomainUserId,
			OrganizationPermissions.ManageCampaigns, cancellationToken);

		if (!hasPermission)
			return ServiceResponse<CampaignDto>.Failure("Недостатньо прав для створення збору");

		var allowance = await _planLimitService.CanCreateCampaignAsync(request.OrganizationId, cancellationToken);
		if (!allowance.CanCreate)
			return ServiceResponse<CampaignDto>.Failure("Досягнуто ліміт зборів для поточного тарифного плану");

		var campaign = new Campaign
		{
			OrganizationId = request.OrganizationId,
			CreatedByUserId = request.CallerDomainUserId,
			Title = request.Title,
			Description = request.Description,
			GoalAmount = request.GoalAmount,
			Deadline = request.Deadline?.ToUniversalTime(),
			SendUrl = string.IsNullOrWhiteSpace(request.SendUrl) ? null : request.SendUrl.Trim(),
			Status = CampaignStatus.Draft,
			CurrentAmount = 0
		};

		_db.Campaigns.Add(campaign);
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<CampaignDto>.Success(new CampaignDto(
			campaign.Id, campaign.Title, campaign.Description,
			StorageUrlResolver.Resolve(_fileStorage, campaign.CoverImageStorageKey),
			campaign.GoalAmount, campaign.CurrentAmount, 0, 0, 0,
			campaign.Status, campaign.StartDate, campaign.Deadline,
			campaign.MonobankAccountId, campaign.SendUrl, 0, campaign.CreatedAt));
	}
}
