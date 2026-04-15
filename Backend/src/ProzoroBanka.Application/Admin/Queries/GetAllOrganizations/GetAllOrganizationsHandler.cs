using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Admin.Queries.GetAllOrganizations;

public class GetAllOrganizationsHandler
	: IRequestHandler<GetAllOrganizationsQuery, ServiceResponse<AdminOrganizationListResponse>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetAllOrganizationsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<AdminOrganizationListResponse>> Handle(
		GetAllOrganizationsQuery request, CancellationToken ct)
	{
		var query = _db.Organizations.Where(o => !o.IsDeleted);

		if (!string.IsNullOrWhiteSpace(request.Search))
		{
			var term = request.Search.Trim();
			query = query.Where(o =>
				o.Name.Contains(term) ||
				o.Slug.Contains(term) ||
				o.OwnerUser.Email.Contains(term));
		}

		if (request.VerifiedOnly == true)
			query = query.Where(o => o.IsVerified);
		else if (request.VerifiedOnly == false)
			query = query.Where(o => !o.IsVerified);

		var totalCount = await query.CountAsync(ct);

		var orgs = await query
			.OrderByDescending(o => o.CreatedAt)
			.Skip((request.Page - 1) * request.PageSize)
			.Take(request.PageSize)
			.Select(o => new
			{
				o.Id,
				o.Name,
				o.Slug,
				o.Description,
				o.LogoStorageKey,
				o.IsVerified,
				o.Website,
				o.ContactEmail,
				o.Phone,
				o.OwnerUserId,
				OwnerName = o.OwnerUser.FirstName + " " + o.OwnerUser.LastName,
				OwnerEmail = o.OwnerUser.Email,
				MemberCount = o.Members.Count(),
				CampaignCount = o.Campaigns.Count(c => !c.IsDeleted),
				TotalRaised = o.Campaigns.Where(c => !c.IsDeleted).Sum(c => c.CurrentAmount),
				o.CreatedAt,
				o.PlanType,
				o.IsBlocked,
				o.BlockReason
			})
			.ToListAsync(ct);

		var items = orgs.Select(o => new AdminOrganizationDto(
			o.Id,
			o.Name,
			o.Slug,
			o.Description,
			_fileStorage.ResolvePublicUrl(o.LogoStorageKey),
			o.IsVerified,
			o.Website,
			o.ContactEmail,
			o.Phone,
			o.OwnerUserId,
			o.OwnerName,
			o.OwnerEmail,
			o.MemberCount,
			o.CampaignCount,
			o.TotalRaised,
			o.CreatedAt,
			o.PlanType == 0 ? OrganizationPlanType.Free : o.PlanType,
			o.IsBlocked,
			o.BlockReason
		)).ToList();

		var response = new AdminOrganizationListResponse(items, totalCount, request.Page, request.PageSize);
		return ServiceResponse<AdminOrganizationListResponse>.Success(response);
	}
}
