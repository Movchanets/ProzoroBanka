using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Receipts.Common;

public static class ReceiptPipelineQueryExtensions
{
	public static IQueryable<Receipt> WithPipelineGraph(this IQueryable<Receipt> query)
	{
		return query
			.Include(r => r.ItemPhotos)
			.Include(r => r.Items)
			.Include(r => r.Campaign);
	}

	public static Task<Receipt?> FindWithPipelineGraphByIdAsync(
		this IApplicationDbContext db,
		Guid receiptId,
		CancellationToken ct)
	{
		return db.Receipts
			.WithPipelineGraph()
			.FirstOrDefaultAsync(r => r.Id == receiptId, ct);
	}

	public static Task<Receipt?> FindOwnedWithPipelineGraphAsync(
		this IApplicationDbContext db,
		Guid receiptId,
		Guid callerDomainUserId,
		CancellationToken ct)
	{
		return db.Receipts
			.WithPipelineGraph()
			.FirstOrDefaultAsync(r => r.Id == receiptId && r.UserId == callerDomainUserId, ct);
	}

	public static async Task<Receipt?> FindAccessibleWithPipelineGraphAsync(
		this IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		Guid receiptId,
		Guid callerDomainUserId,
		CancellationToken ct)
	{
		var receipt = await db.FindWithPipelineGraphByIdAsync(receiptId, ct);
		if (receipt is null)
			return null;

		if (receipt.UserId == callerDomainUserId)
			return receipt;

		if (!receipt.OrganizationId.HasValue)
			return null;

		var isOrgMember = await orgAuth.IsMember(receipt.OrganizationId.Value, callerDomainUserId, ct);
		return isOrgMember ? receipt : null;
	}

	public static Task<Receipt> GetOwnedWithPipelineGraphNoTrackingAsync(
		this IApplicationDbContext db,
		Guid receiptId,
		Guid callerDomainUserId,
		CancellationToken ct)
	{
		return db.Receipts
			.AsNoTracking()
			.WithPipelineGraph()
			.FirstAsync(r => r.Id == receiptId && r.UserId == callerDomainUserId, ct);
	}
}