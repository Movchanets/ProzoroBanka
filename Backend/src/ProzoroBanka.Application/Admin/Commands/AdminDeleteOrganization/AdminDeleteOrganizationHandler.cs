using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.AdminDeleteOrganization;

public class AdminDeleteOrganizationHandler : IRequestHandler<AdminDeleteOrganizationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public AdminDeleteOrganizationHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(AdminDeleteOrganizationCommand request, CancellationToken ct)
	{
		var org = await _db.Organizations
			.Include(o => o.Campaigns)
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, ct);

		if (org is null)
			return ServiceResponse.Failure("Організацію не знайдено.");

		// Soft-delete the organization and all its campaigns
		org.IsDeleted = true;
		org.UpdatedAt = DateTime.UtcNow;

		foreach (var campaign in org.Campaigns.Where(c => !c.IsDeleted))
		{
			campaign.IsDeleted = true;
			campaign.UpdatedAt = DateTime.UtcNow;
		}

		await _db.SaveChangesAsync(ct);

		return ServiceResponse.Success($"Організацію «{org.Name}» видалено адміністратором.");
	}
}
