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