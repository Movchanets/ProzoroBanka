using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetOrganizationTransparency;

public record GetOrganizationTransparencyQuery(string Slug) : IRequest<ServiceResponse<TransparencyDto>>;

public class GetOrganizationTransparencyHandler
	: IRequestHandler<GetOrganizationTransparencyQuery, ServiceResponse<TransparencyDto>>
{
	private readonly IApplicationDbContext _db;

	public GetOrganizationTransparencyHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<TransparencyDto>> Handle(
		GetOrganizationTransparencyQuery request,
		CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.AsNoTracking()
			.Where(o => o.Slug == request.Slug)
			.Select(o => new { o.Id })
			.FirstOrDefaultAsync(cancellationToken);

		if (org is null)
			return ServiceResponse<TransparencyDto>.Failure("Організацію не знайдено");

		var memberIds = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == org.Id)
			.Select(m => m.UserId)
			.ToListAsync(cancellationToken);

		var receipts = await _db.Receipts
			.AsNoTracking()
			.Where(r => memberIds.Contains(r.UserId) && r.Status == ReceiptStatus.Verified)
			.Select(r => new
			{
				r.MerchantName,
				r.TotalAmount,
				r.TransactionDate,
				r.CreatedAt
			})
			.ToListAsync(cancellationToken);

		var validReceipts = receipts
			.Where(r => r.TotalAmount.HasValue)
			.ToList();

		var totalSpent = validReceipts.Sum(r => r.TotalAmount ?? 0m);

		var categories = validReceipts
			.GroupBy(r => string.IsNullOrWhiteSpace(r.MerchantName) ? "Інше" : r.MerchantName!)
			.OrderByDescending(g => g.Sum(x => x.TotalAmount ?? 0m))
			.Take(6)
			.Select(g =>
			{
				var amount = g.Sum(x => x.TotalAmount ?? 0m);
				var pct = totalSpent <= 0 ? 0 : (double)(amount / totalSpent * 100);
				return new TransparencyCategoryDto(g.Key, amount, pct);
			})
			.ToList();

		var monthly = validReceipts
			.GroupBy(r => (r.TransactionDate ?? r.CreatedAt).ToString("yyyy-MM"))
			.OrderBy(g => g.Key)
			.Select(g => new TransparencyMonthlyDto(
				g.Key,
				g.Sum(x => x.TotalAmount ?? 0m)))
			.ToList();

		return ServiceResponse<TransparencyDto>.Success(new TransparencyDto(
			totalSpent,
			categories,
			monthly,
			receipts.Count,
			receipts.Count));
	}
}
