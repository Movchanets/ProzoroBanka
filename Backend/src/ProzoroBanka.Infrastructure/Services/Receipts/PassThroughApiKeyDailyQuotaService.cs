using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class PassThroughApiKeyDailyQuotaService : IApiKeyDailyQuotaService
{
	public Task<QuotaDecision> TryConsumeAsync(string keyFingerprint, DateTime utcNow, CancellationToken ct)
		=> Task.FromResult(new QuotaDecision(true, null));
}
