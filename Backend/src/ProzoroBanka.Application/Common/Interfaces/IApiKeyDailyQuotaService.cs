using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IApiKeyDailyQuotaService
{
	Task<QuotaDecision> TryConsumeAsync(string keyFingerprint, DateTime utcNow, CancellationToken ct);
}