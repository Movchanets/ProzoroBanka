using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Common.Extensions;

public static class ReceiptQueryExtensions
{
	public static IQueryable<Receipt> WhereActiveVerifiedForDocumentation(this IQueryable<Receipt> query)
	{
		return query.Where(r =>
			r.Status == ReceiptStatus.StateVerified
			&& r.PublicationStatus == ReceiptPublicationStatus.Active);
	}
}