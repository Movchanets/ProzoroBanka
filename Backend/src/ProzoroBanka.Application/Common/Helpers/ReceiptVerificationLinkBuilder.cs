using System.Globalization;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Common.Helpers;

public static class ReceiptVerificationLinkBuilder
{
	private const string TaxCabinetBaseUrl = "https://cabinet.tax.gov.ua/cashregs/check";

	public static bool TryBuildTaxCabinetLink(Receipt receipt, out string? url, out string? missingFields)
	{
		url = null;
		missingFields = null;

		var txDate = receipt.PurchaseDateUtc ?? receipt.TransactionDate;
		var fn = receipt.FiscalNumber?.Trim();
		var receiptCode = receipt.ReceiptCode?.Trim();
		var sum = receipt.TotalAmount;

		var missing = new List<string>();
		if (!txDate.HasValue)
			missing.Add("date/time");
		if (string.IsNullOrWhiteSpace(fn))
			missing.Add("fn");
		if (string.IsNullOrWhiteSpace(receiptCode))
			missing.Add("id");
		if (!sum.HasValue)
			missing.Add("sm");

		if (missing.Count > 0)
		{
			missingFields = string.Join(", ", missing);
			return false;
		}

		var normalizedDate = NormalizeReceiptDate(txDate!.Value);
		var date = normalizedDate.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
		var time = normalizedDate.ToString("HHmmss", CultureInfo.InvariantCulture);
		var totalAmount = (sum!.Value / 100m).ToString("0.00", CultureInfo.InvariantCulture);

		url = $"{TaxCabinetBaseUrl}?date={Uri.EscapeDataString(date)}&time={Uri.EscapeDataString(time)}&id={Uri.EscapeDataString(receiptCode!)}&sm={Uri.EscapeDataString(totalAmount)}&fn={Uri.EscapeDataString(fn!)}";
		return true;
	}

	private static DateTime NormalizeReceiptDate(DateTime dateTime)
	{
		return dateTime.Kind switch
		{
			DateTimeKind.Utc => dateTime,
			DateTimeKind.Local => dateTime.ToUniversalTime(),
			_ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
		};
	}
}
