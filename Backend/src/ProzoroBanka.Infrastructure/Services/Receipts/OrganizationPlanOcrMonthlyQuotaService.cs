using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using System.Globalization;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class OrganizationPlanOcrMonthlyQuotaService : IOcrMonthlyQuotaService
{
	private readonly IApplicationDbContext _db;
	private readonly ISystemSettingsService _systemSettingsService;

	public OrganizationPlanOcrMonthlyQuotaService(
		IApplicationDbContext db,
		ISystemSettingsService systemSettingsService)
	{
		_db = db;
		_systemSettingsService = systemSettingsService;
	}

	public async Task<QuotaDecision> TryConsumeAsync(Guid organizationId, DateTime utcNow, CancellationToken ct)
	{
		var orgPlan = await _db.Organizations
			.AsNoTracking()
			.Where(o => o.Id == organizationId)
			.Select(o => o.PlanType)
			.FirstOrDefaultAsync(ct);

		if (orgPlan == 0)
			return new QuotaDecision(false, "Організацію не знайдено");

		var limits = await _systemSettingsService.GetPlanLimitsAsync(orgPlan, ct);
		var monthStart = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
		var nextMonthStart = monthStart.AddMonths(1);
		var usageKey = BuildUsageKey(organizationId, utcNow);

		var usageSetting = await _db.SystemSettings
			.FirstOrDefaultAsync(s => s.Key == usageKey && !s.IsDeleted, ct);

		var usedThisMonth = usageSetting is not null && int.TryParse(usageSetting.Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedUsage)
			? parsedUsage
			: await GetLegacyMonthlyCompletedCount(organizationId, monthStart, nextMonthStart, ct);

		if (usedThisMonth >= limits.MaxOcrExtractionsPerMonth)
			return new QuotaDecision(false, $"Місячний ліміт OCR вичерпано ({limits.MaxOcrExtractionsPerMonth})");

		var nextUsage = usedThisMonth + 1;
		if (usageSetting is null)
		{
			usageSetting = new SystemSetting
			{
				Key = usageKey,
				Value = nextUsage.ToString(CultureInfo.InvariantCulture),
			};
			_db.SystemSettings.Add(usageSetting);
		}
		else
		{
			usageSetting.Value = nextUsage.ToString(CultureInfo.InvariantCulture);
		}

		await _db.SaveChangesAsync(ct);

		return new QuotaDecision(true, null);
	}

	private async Task<int> GetLegacyMonthlyCompletedCount(
		Guid organizationId,
		DateTime monthStart,
		DateTime nextMonthStart,
		CancellationToken ct)
	{
		var memberIds = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == organizationId && !m.IsDeleted)
			.Select(m => m.UserId)
			.ToListAsync(ct);

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
				ct);
	}

	private static string BuildUsageKey(Guid organizationId, DateTime utcNow)
		=> $"org:{organizationId:N}:ocr-usage:{utcNow:yyyyMM}";
}
