using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

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

		var memberIds = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == organizationId && !m.IsDeleted)
			.Select(m => m.UserId)
			.ToListAsync(ct);

		if (memberIds.Count == 0)
			return new QuotaDecision(false, "В організації немає активних учасників");

		var usedThisMonth = await _db.Receipts
			.AsNoTracking()
			.CountAsync(r =>
				memberIds.Contains(r.UserId)
				&& !r.IsDeleted
				&& r.OcrExtractedAtUtc.HasValue
				&& r.OcrExtractedAtUtc.Value >= monthStart
				&& r.OcrExtractedAtUtc.Value < nextMonthStart,
				ct);

		if (usedThisMonth >= limits.MaxOcrExtractionsPerMonth)
			return new QuotaDecision(false, $"Місячний ліміт OCR вичерпано ({limits.MaxOcrExtractionsPerMonth})");

		return new QuotaDecision(true, null);
	}
}
