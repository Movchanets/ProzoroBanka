namespace ProzoroBanka.Domain.Enums;

/// <summary>
/// Статус логічної закупівлі в рамках збору.
/// </summary>
public enum PurchaseStatus
{
	PaymentSent = 0,
	PartiallyReceived = 1,
	Completed = 2,
	Cancelled = 3
}
