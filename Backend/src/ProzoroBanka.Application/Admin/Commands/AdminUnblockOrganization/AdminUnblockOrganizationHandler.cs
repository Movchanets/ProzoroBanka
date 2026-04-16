using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.AdminUnblockOrganization;

public record AdminUnblockOrganizationCommand(Guid OrganizationId) : IRequest<ServiceResponse>;

public class AdminUnblockOrganizationHandler : IRequestHandler<AdminUnblockOrganizationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly ICurrentUserService _currentUserService;

	public AdminUnblockOrganizationHandler(IApplicationDbContext db, ICurrentUserService currentUserService)
	{
		_db = db;
		_currentUserService = currentUserService;
	}

	public async Task<ServiceResponse> Handle(AdminUnblockOrganizationCommand request, CancellationToken cancellationToken)
	{
		if (!_currentUserService.IsAdmin)
			return ServiceResponse.Failure("Доступ заборонено.");

		var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, cancellationToken);
		if (org is null)
			return ServiceResponse.Failure("Організацію не знайдено.");

		if (!org.IsBlocked)
			return ServiceResponse.Failure("Організація не заблокована.");

		org.IsBlocked = false;
		org.BlockReason = null;
		org.BlockedAtUtc = null;

		await _db.SaveChangesAsync(cancellationToken);
		return ServiceResponse.Success();
	}
}
