namespace ProzoroBanka.Application.Common.Helpers;

public static class CampaignDocumentationMetrics
{
	public static long ToMinorUnitsFromStoredAmount(decimal amount)
	{
		// Legacy rows may store UAH (with fractional part), while newer rows store kopecks as whole numbers.
		if (amount == decimal.Truncate(amount))
			return decimal.ToInt64(decimal.Round(amount, 0, MidpointRounding.AwayFromZero));

		return decimal.ToInt64(decimal.Round(amount * 100m, 0, MidpointRounding.AwayFromZero));
	}

	public static long ToMinorUnitsFromStoredAmount(decimal? amount)
	{
		return amount.HasValue ? ToMinorUnitsFromStoredAmount(amount.Value) : 0;
	}

	public static long BoundToCollectedAmount(long documentedAmountMinor, long collectedAmountMinor)
	{
		var normalizedDocumented = Math.Max(0, documentedAmountMinor);
		var normalizedCollected = Math.Max(0, collectedAmountMinor);
		return Math.Min(normalizedDocumented, normalizedCollected);
	}

	public static double CalculateDocumentedSharePercent(long documentedAmountMinor, long collectedAmountMinor)
	{
		var normalizedCollected = Math.Max(0, collectedAmountMinor);
		if (normalizedCollected <= 0)
			return 0;

		var normalizedDocumented = Math.Max(0, documentedAmountMinor);
		return Math.Min(100, (double)normalizedDocumented / normalizedCollected * 100);
	}
}