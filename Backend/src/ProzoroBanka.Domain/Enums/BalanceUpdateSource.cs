namespace ProzoroBanka.Domain.Enums;

/// <summary>
/// Джерело оновлення балансу кампанії.
/// </summary>
public enum BalanceUpdateSource
{
	Manual = 0,
	MonobankWebhook = 1
}
