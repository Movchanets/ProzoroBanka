using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.AdminBlockOrganization;

public record AdminBlockOrganizationCommand(Guid OrganizationId, string Reason) : IRequest<ServiceResponse>;

public class AdminBlockOrganizationHandler : IRequestHandler<AdminBlockOrganizationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly ICurrentUserService _currentUserService;

	public AdminBlockOrganizationHandler(IApplicationDbContext db, ICurrentUserService currentUserService)
	{
		_db = db;
		_currentUserService = currentUserService;
	}

	public async Task<ServiceResponse> Handle(AdminBlockOrganizationCommand request, CancellationToken cancellationToken)
	{
		if (!_currentUserService.IsAdmin)
			return ServiceResponse.Failure("Доступ заборонено. Тільки адміністратори можуть блокувати організації.");

		if (string.IsNullOrWhiteSpace(request.Reason))
			return ServiceResponse.Failure("Причина блокування є обов'язковою.");

		var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, cancellationToken);
		if (org is null)
			return ServiceResponse.Failure("Організацію не знайдено.");

		if (org.IsBlocked)
			return ServiceResponse.Failure("Організація вже заблокована.");

		org.IsBlocked = true;
		org.BlockReason = request.Reason;
		org.BlockedAtUtc = DateTime.UtcNow;

		await _db.SaveChangesAsync(cancellationToken);
		return ServiceResponse.Success();
	}
}
