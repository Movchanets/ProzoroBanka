using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IOcrMonthlyQuotaService
{
	Task<QuotaDecision> TryConsumeAsync(Guid organizationId, DateTime utcNow, CancellationToken ct);
}