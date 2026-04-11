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
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, cancellationToken);

		if (org is null)
			return ServiceResponse<OrganizationPlanUsageDto>.Failure("Організацію не знайдено");

		var currentMembers = org.Members.Count(m => !m.IsDeleted);
		var currentCampaigns = org.Campaigns.Count(c => !c.IsDeleted);

		var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
		var nextMonthStart = monthStart.AddMonths(1);
		var memberIds = org.Members.Where(m => !m.IsDeleted).Select(m => m.UserId).ToList();
		var currentOcrExtractions = await _db.Receipts
			.AsNoTracking()
			.CountAsync(r =>
				memberIds.Contains(r.UserId)
				&& !r.IsDeleted
				&& r.OcrExtractedAtUtc.HasValue
				&& r.OcrExtractedAtUtc.Value >= monthStart
				&& r.OcrExtractedAtUtc.Value < nextMonthStart,
				cancellationToken);

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
