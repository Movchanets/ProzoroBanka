using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Queries.GetOrganizationPlanUsage;

public record GetOrganizationPlanUsageQuery(
	Guid OrganizationId) : IRequest<ServiceResponse<OrganizationPlanUsageDto>>;

public class GetOrganizationPlanUsageHandler : IRequestHandler<GetOrganizationPlanUsageQuery, ServiceResponse<OrganizationPlanUsageDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly ISystemSettingsService _systemSettings;

	public GetOrganizationPlanUsageHandler(
		IApplicationDbContext db,
		ISystemSettingsService systemSettings)
	{
		_db = db;
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<OrganizationPlanUsageDto>> Handle(
		GetOrganizationPlanUsageQuery request, CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.AsNoTracking()
			.Include(o => o.Members)
			.Include(o => o.Campaigns)
			// we also would count OCR extractions per month if we had them connected to Campaigns directly. Right now OCR is per receipt in a campaign
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, cancellationToken);

		if (org is null)
			return ServiceResponse<OrganizationPlanUsageDto>.Failure("Організацію не знайдено");

		var currentMembers = org.Members.Count(m => !m.IsDeleted);
		var currentCampaigns = org.Campaigns.Count(c => !c.IsDeleted);

		// OCR extraction simplified for now if we don't have receipt OCR usage stored at the Org level easily
		var currentOcrExtractions = 0; // TODO in real implementation we could sum Receipts.Extractions based on Campaigns from this month

		var limits = await _systemSettings.GetPlanLimitsAsync(org.PlanType, cancellationToken);

		return ServiceResponse<OrganizationPlanUsageDto>.Success(new OrganizationPlanUsageDto(
			org.PlanType,
			limits.MaxCampaigns,
			currentCampaigns,
			limits.MaxMembers,
			currentMembers,
			limits.MaxOcrExtractionsPerMonth,
			currentOcrExtractions));
	}
}
