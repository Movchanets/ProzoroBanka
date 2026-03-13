using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.LeaveOrganization;

public class LeaveOrganizationHandler : IRequestHandler<LeaveOrganizationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public LeaveOrganizationHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(
		LeaveOrganizationCommand request, CancellationToken cancellationToken)
	{
		var membership = await _db.OrganizationMembers
			.FirstOrDefaultAsync(
				m => m.OrganizationId == request.OrganizationId
					 && m.UserId == request.CallerDomainUserId,
				cancellationToken);

		if (membership is null)
			return ServiceResponse.Failure("Ви не є учасником цієї організації");

		if (membership.Role == OrganizationRole.Owner)
			return ServiceResponse.Failure("Власник не може вийти з організації. Спочатку передайте право власності.");

		membership.IsDeleted = true;
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success("Ви вийшли з організації");
	}
}
