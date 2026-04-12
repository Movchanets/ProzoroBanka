using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Application.Common.Extensions;

namespace ProzoroBanka.Application.Organizations.Commands.SetOrganizationPlan;

public record SetOrganizationPlanCommand(
	Guid OrganizationId,
	OrganizationPlanType PlanType,
	Guid CallerDomainUserId) : IRequest<ServiceResponse<OrganizationDto>>;

public class SetOrganizationPlanHandler : IRequestHandler<SetOrganizationPlanCommand, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public SetOrganizationPlanHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		SetOrganizationPlanCommand request, CancellationToken cancellationToken)
	{
		var org = await _db.Organizations
			.Include(o => o.Members)
			.FirstOrDefaultAsync(o => o.Id == request.OrganizationId && !o.IsDeleted, cancellationToken);

		if (org is null)
			return ServiceResponse<OrganizationDto>.Failure("Організацію не знайдено");

		if (org.PlanType == request.PlanType)
			return ServiceResponse<OrganizationDto>.Failure("Організація вже має цей тарифний план");

		org.PlanType = request.PlanType;
		org.PlanChangedAtUtc = DateTime.UtcNow;
		org.PlanChangedByUserId = request.CallerDomainUserId;

		await _db.SaveChangesAsync(cancellationToken);

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, _fileStorage.ResolvePublicUrl(org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.Phone, org.OwnerUserId, org.Members.Count, org.CreatedAt, org.PlanType));
	}
}
