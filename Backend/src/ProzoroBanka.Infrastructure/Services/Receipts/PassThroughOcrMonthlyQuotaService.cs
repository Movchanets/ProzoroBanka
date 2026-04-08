using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class PassThroughOcrMonthlyQuotaService : IOcrMonthlyQuotaService
{
	public Task<QuotaDecision> TryConsumeAsync(Guid organizationId, DateTime utcNow, CancellationToken ct)
		=> Task.FromResult(new QuotaDecision(true, null));
}
