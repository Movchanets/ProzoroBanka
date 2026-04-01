using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Infrastructure.Services;

public class SystemSettingsService : ISystemSettingsService
{
	private readonly IApplicationDbContext _db;
	private readonly OrganizationPlansOptions _options;

	public SystemSettingsService(
		IApplicationDbContext db,
		IOptions<OrganizationPlansOptions> options)
	{
		_db = db;
		_options = options.Value;
	}

	public async Task<OrganizationPlanLimits> GetPlanLimitsAsync(OrganizationPlanType planType, CancellationToken cancellationToken)
	{
		var planDefaults = planType == OrganizationPlanType.Paid ? _options.Paid : _options.Free;
		var maxCampaignsKey = planType == OrganizationPlanType.Paid
			? OrganizationPlansOptions.PaidMaxCampaignsSettingKey
			: OrganizationPlansOptions.FreeMaxCampaignsSettingKey;
		var maxMembersKey = planType == OrganizationPlanType.Paid
			? OrganizationPlansOptions.PaidMaxMembersSettingKey
			: OrganizationPlansOptions.FreeMaxMembersSettingKey;
		var maxOcrKey = planType == OrganizationPlanType.Paid
			? OrganizationPlansOptions.PaidMaxOcrExtractionsSettingKey
			: OrganizationPlansOptions.FreeMaxOcrExtractionsSettingKey;

		var values = await GetValuesByKeysAsync([maxCampaignsKey, maxMembersKey, maxOcrKey], cancellationToken);

		return new OrganizationPlanLimits
		{
			MaxCampaigns = ParsePositiveIntOrDefault(values.GetValueOrDefault(maxCampaignsKey), planDefaults.MaxCampaigns),
			MaxMembers = ParsePositiveIntOrDefault(values.GetValueOrDefault(maxMembersKey), planDefaults.MaxMembers),
			MaxOcrExtractionsPerMonth = ParsePositiveIntOrDefault(values.GetValueOrDefault(maxOcrKey), planDefaults.MaxOcrExtractionsPerMonth)
		};
	}

	public async Task<int> GetMaxOwnedOrganizationsForNonAdminAsync(CancellationToken cancellationToken)
	{
		var rawValue = await GetValueByKeyAsync(OrganizationPlansOptions.NonAdminOrganizationLimitSettingKey, cancellationToken);
		return ParsePositiveIntOrDefault(rawValue, _options.MaxOwnedOrganizationsForNonAdmin);
	}

	public async Task<int> GetMaxJoinedOrganizationsForNonAdminAsync(CancellationToken cancellationToken)
	{
		var rawValue = await GetValueByKeyAsync(OrganizationPlansOptions.NonAdminJoinedOrganizationsLimitSettingKey, cancellationToken);
		return ParsePositiveIntOrDefault(rawValue, _options.MaxJoinedOrganizationsForNonAdmin);
	}

	public async Task SavePlanLimitsAsync(OrganizationPlanType planType, OrganizationPlanLimits limits, CancellationToken cancellationToken)
	{
		var keyValuePairs = planType == OrganizationPlanType.Paid
			? new Dictionary<string, int>
			{
				[OrganizationPlansOptions.PaidMaxCampaignsSettingKey] = limits.MaxCampaigns,
				[OrganizationPlansOptions.PaidMaxMembersSettingKey] = limits.MaxMembers,
				[OrganizationPlansOptions.PaidMaxOcrExtractionsSettingKey] = limits.MaxOcrExtractionsPerMonth
			}
			: new Dictionary<string, int>
			{
				[OrganizationPlansOptions.FreeMaxCampaignsSettingKey] = limits.MaxCampaigns,
				[OrganizationPlansOptions.FreeMaxMembersSettingKey] = limits.MaxMembers,
				[OrganizationPlansOptions.FreeMaxOcrExtractionsSettingKey] = limits.MaxOcrExtractionsPerMonth
			};

		await UpsertValuesAsync(keyValuePairs, cancellationToken);
	}

	public async Task SaveGeneralLimitsAsync(int maxOwnedOrganizationsForNonAdmin, int maxJoinedOrganizationsForNonAdmin, CancellationToken cancellationToken)
	{
		await UpsertValuesAsync(new Dictionary<string, int>
		{
			[OrganizationPlansOptions.NonAdminOrganizationLimitSettingKey] = maxOwnedOrganizationsForNonAdmin,
			[OrganizationPlansOptions.NonAdminJoinedOrganizationsLimitSettingKey] = maxJoinedOrganizationsForNonAdmin
		}, cancellationToken);
	}

	private async Task<string?> GetValueByKeyAsync(string key, CancellationToken cancellationToken)
	{
		return await _db.SystemSettings
			.AsNoTracking()
			.Where(setting => setting.Key == key)
			.Select(setting => setting.Value)
			.FirstOrDefaultAsync(cancellationToken);
	}

	private async Task<Dictionary<string, string>> GetValuesByKeysAsync(IReadOnlyCollection<string> keys, CancellationToken cancellationToken)
	{
		return await _db.SystemSettings
			.AsNoTracking()
			.Where(setting => keys.Contains(setting.Key))
			.ToDictionaryAsync(setting => setting.Key, setting => setting.Value, cancellationToken);
	}

	private async Task UpsertValuesAsync(Dictionary<string, int> keyValues, CancellationToken cancellationToken)
	{
		var keys = keyValues.Keys.ToArray();
		var existing = await _db.SystemSettings
			.Where(setting => keys.Contains(setting.Key))
			.ToDictionaryAsync(setting => setting.Key, cancellationToken);

		foreach (var pair in keyValues)
		{
			if (existing.TryGetValue(pair.Key, out var setting))
			{
				setting.Value = pair.Value.ToString();
				continue;
			}

			_db.SystemSettings.Add(new SystemSetting
			{
				Key = pair.Key,
				Value = pair.Value.ToString()
			});
		}

		await _db.SaveChangesAsync(cancellationToken);
	}

	private static int ParsePositiveIntOrDefault(string? rawValue, int fallback)
	{
		return int.TryParse(rawValue, out var parsedValue) && parsedValue > 0
			? parsedValue
			: Math.Max(1, fallback);
	}
}
