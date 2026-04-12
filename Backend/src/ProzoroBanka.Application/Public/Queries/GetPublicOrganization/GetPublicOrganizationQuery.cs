using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetPublicOrganization;

public record GetPublicOrganizationQuery(string Slug) : IRequest<ServiceResponse<PublicOrganizationDto>>;

public class GetPublicOrganizationHandler : IRequestHandler<GetPublicOrganizationQuery, ServiceResponse<PublicOrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicOrganizationHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicOrganizationDto>> Handle(
		GetPublicOrganizationQuery request,
		CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.AsNoTracking()
			.Where(o => o.Slug == request.Slug)
			.Select(o => new
			{
				o.Id,
				o.Name,
				o.Slug,
				o.Description,
				o.LogoStorageKey,
				o.IsVerified,
				o.Website,
				MemberCount = o.Members.Count,
				ActiveCampaignCount = o.Campaigns.Count(c => c.Status == CampaignStatus.Active),
				TotalRaised = o.Campaigns.Where(c => c.Status != CampaignStatus.Draft)
					.Sum(c => (long?)c.CurrentAmount) ?? 0L
			})
			.FirstOrDefaultAsync(cancellationToken);

		if (org is null)
			return ServiceResponse<PublicOrganizationDto>.Failure("Організацію не знайдено");

		var members = await _db.OrganizationMembers
			.AsNoTracking()
			.Where(m => m.OrganizationId == org.Id)
			.OrderBy(m => m.JoinedAt)
			.Select(m => new PublicTeamMemberDto(
				m.UserId,
				m.User.FirstName,
				m.User.LastName,
				_fileStorage.ResolvePublicUrl(m.User.ProfilePhotoStorageKey)))
			.Take(12)
			.ToListAsync(cancellationToken);

		return ServiceResponse<PublicOrganizationDto>.Success(new PublicOrganizationDto(
			org.Id,
			org.Name,
			org.Slug,
			org.Description,
			_fileStorage.ResolvePublicUrl(org.LogoStorageKey),
			org.IsVerified,
			org.Website,
			org.MemberCount,
			org.ActiveCampaignCount,
			org.TotalRaised,
			members));
	}
}
