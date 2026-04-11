using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using System.Globalization;

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
		var usageKey = BuildUsageKey(org.Id, DateTime.UtcNow);
		var usageValue = await _db.SystemSettings
			.AsNoTracking()
			.Where(s => s.Key == usageKey && !s.IsDeleted)
			.Select(s => s.Value)
			.FirstOrDefaultAsync(cancellationToken);

		var currentOcrExtractions = int.TryParse(usageValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedUsage)
			? parsedUsage
			: await GetLegacyMonthlyCompletedCount(org.Members.Where(m => !m.IsDeleted).Select(m => m.UserId).ToList(), monthStart, nextMonthStart, cancellationToken);

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

	private async Task<int> GetLegacyMonthlyCompletedCount(
		List<Guid> memberIds,
		DateTime monthStart,
		DateTime nextMonthStart,
		CancellationToken cancellationToken)
	{
		if (memberIds.Count == 0)
			return 0;

		return await _db.Receipts
			.AsNoTracking()
			.CountAsync(r =>
				memberIds.Contains(r.UserId)
				&& !r.IsDeleted
				&& r.OcrExtractedAtUtc.HasValue
				&& r.OcrExtractedAtUtc.Value >= monthStart
				&& r.OcrExtractedAtUtc.Value < nextMonthStart,
				cancellationToken);
	}

	private static string BuildUsageKey(Guid organizationId, DateTime utcNow)
		=> $"org:{organizationId:N}:ocr-usage:{utcNow:yyyyMM}";
}
