namespace ProzoroBanka.Application.Common.Helpers;

/// <summary>
/// Centralizes money unit conversion so minor-unit storage stays consistent.
/// </summary>
public static class MoneyConversion
{
	public static long ToMinorUnits(decimal amount)
	{
		return decimal.ToInt64(decimal.Round(amount * 100m, 0, MidpointRounding.AwayFromZero));
	}

	public static long ToMinorUnits(decimal? amount)
	{
		return amount.HasValue ? ToMinorUnits(amount.Value) : 0;
	}
}