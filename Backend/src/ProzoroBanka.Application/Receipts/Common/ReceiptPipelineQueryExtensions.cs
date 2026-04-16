using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

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

	public static async Task<ServiceResponse<Receipt>> FindManageableOrganizationReceiptAsync(
		this IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		Guid receiptId,
		Guid callerDomainUserId,
		Guid? expectedOrganizationId,
		CancellationToken ct)
	{
		var receipt = await db.FindWithPipelineGraphByIdAsync(receiptId, ct);
		if (receipt is null || !receipt.OrganizationId.HasValue)
			return ServiceResponse<Receipt>.Failure("Чек не знайдено");

		var organizationId = receipt.OrganizationId.Value;
		if (expectedOrganizationId.HasValue && expectedOrganizationId.Value != organizationId)
			return ServiceResponse<Receipt>.Failure("Чек не знайдено");

		var access = await orgAuth.EnsureOrganizationAccessAsync(
			organizationId,
			callerDomainUserId,
			requiredPermission: OrganizationPermissions.ManageReceipts,
			ct: ct);

		if (!access.IsSuccess)
		{
			if (string.Equals(access.Message, "Організацію не знайдено", StringComparison.Ordinal))
				return ServiceResponse<Receipt>.Failure("Чек не знайдено");

			return ServiceResponse<Receipt>.Failure(access.Message);
		}

		return ServiceResponse<Receipt>.Success(receipt);
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