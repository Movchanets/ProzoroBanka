using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Receipts.Common;

/// <summary>
/// Shared helpers used by receipt mutation handlers to keep normalization and
/// verification link updates consistent.
/// </summary>
public static class ReceiptMutationHelpers
{
	/// <summary>
	/// Trims text and converts blank values to <c>null</c>.
	/// </summary>
	public static string? NormalizeNullableText(string? value) =>
		string.IsNullOrWhiteSpace(value) ? null : value.Trim();

	/// <summary>
	/// Normalizes date-time to UTC kind while preserving the clock time for
	/// unspecified values.
	/// </summary>
	public static DateTime? NormalizeToUtc(DateTime? value)
	{
		if (!value.HasValue)
			return null;

		var dateTime = value.Value;
		return dateTime.Kind switch
		{
			DateTimeKind.Utc => dateTime,
			DateTimeKind.Local => dateTime.ToUniversalTime(),
			_ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
		};
	}

	/// <summary>
	/// Recalculates state verification reference from receipt attributes.
	/// </summary>
	public static void RefreshVerificationReference(Receipt receipt)
	{
		receipt.StateVerificationReference = ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var verificationUrl, out _)
			? verificationUrl
			: null;
	}
}