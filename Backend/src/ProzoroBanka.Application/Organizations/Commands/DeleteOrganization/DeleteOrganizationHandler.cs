using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Organizations.Commands.DeleteOrganization;

public class DeleteOrganizationHandler : IRequestHandler<DeleteOrganizationCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;

	public DeleteOrganizationHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse> Handle(
		DeleteOrganizationCommand request, CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId, cancellationToken);

		if (org is null)
			return ServiceResponse.Failure("Організацію не знайдено");

		if (org.OwnerUserId != request.CallerDomainUserId)
			return ServiceResponse.Failure("Тільки власник може видалити організацію");

		org.IsDeleted = true;
		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse.Success("Організацію видалено");
	}
}
