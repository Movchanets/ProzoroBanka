using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.VerifyOrganization;

public class VerifyOrganizationHandler : IRequestHandler<VerifyOrganizationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public VerifyOrganizationHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(VerifyOrganizationCommand request, CancellationToken ct)
	{
		var org = await _db.Organizations.FirstOrDefaultAsync(
			o => o.Id == request.OrganizationId && !o.IsDeleted, ct);

		if (org is null)
			return ServiceResponse.Failure("Організацію не знайдено.");

		org.IsVerified = request.IsVerified;
		org.UpdatedAt = DateTime.UtcNow;

		await _db.SaveChangesAsync(ct);

		var status = request.IsVerified ? "верифікована" : "знято верифікацію";
		return ServiceResponse.Success($"Організацію «{org.Name}» {status}.");
	}
}
