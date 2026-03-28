using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetOrganizationCampaigns;

public class GetAdminOrganizationCampaignsHandler
	: IRequestHandler<GetAdminOrganizationCampaignsQuery, ServiceResponse<IReadOnlyList<AdminCampaignDto>>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetAdminOrganizationCampaignsHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<IReadOnlyList<AdminCampaignDto>>> Handle(
		GetAdminOrganizationCampaignsQuery request, CancellationToken ct)
	{
		var org = await _db.Organizations.FirstOrDefaultAsync(
			o => o.Id == request.OrganizationId && !o.IsDeleted, ct);

		if (org is null)
			return ServiceResponse<IReadOnlyList<AdminCampaignDto>>.Failure("Організацію не знайдено.");

		var campaigns = await _db.Campaigns
			.Where(c => c.OrganizationId == request.OrganizationId && !c.IsDeleted)
			.OrderByDescending(c => c.CreatedAt)
			.Skip((request.Page - 1) * request.PageSize)
			.Take(request.PageSize)
			.Select(c => new
			{
				c.Id,
				c.Title,
				c.Description,
				c.CoverImageStorageKey,
				c.GoalAmount,
				c.CurrentAmount,
				c.Status,
				c.StartDate,
				c.Deadline,
				OrganizationName = c.Organization.Name,
				CreatedByName = c.CreatedBy.FirstName + " " + c.CreatedBy.LastName,
				c.CreatedAt
			})
			.ToListAsync(ct);

		var items = campaigns.Select(c => new AdminCampaignDto(
			c.Id,
			c.Title,
			c.Description,
			StorageUrlResolver.Resolve(_fileStorage, c.CoverImageStorageKey),
			c.GoalAmount,
			c.CurrentAmount,
			c.Status,
			c.StartDate,
			c.Deadline,
			c.OrganizationName,
			c.CreatedByName,
			c.CreatedAt
		)).ToList();

		return ServiceResponse<IReadOnlyList<AdminCampaignDto>>.Success(items);
	}
}
