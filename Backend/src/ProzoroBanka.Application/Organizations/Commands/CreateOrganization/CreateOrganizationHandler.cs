using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Interfaces;

namespace ProzoroBanka.Application.Organizations.Commands.CreateOrganization;

public class CreateOrganizationHandler : IRequestHandler<CreateOrganizationCommand, ServiceResponse<OrganizationDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationRepository _orgRepo;
	private readonly IFileStorage _fileStorage;
	private readonly IUnitOfWork _unitOfWork;
	private readonly ICurrentUserService _currentUser;
	private readonly ISystemSettingsService _systemSettings;

	public CreateOrganizationHandler(
		IApplicationDbContext db,
		IOrganizationRepository orgRepo,
		IFileStorage fileStorage,
		IUnitOfWork unitOfWork,
		ICurrentUserService currentUser,
		ISystemSettingsService systemSettings)
	{
		_db = db;
		_orgRepo = orgRepo;
		_fileStorage = fileStorage;
		_unitOfWork = unitOfWork;
		_currentUser = currentUser;
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<OrganizationDto>> Handle(
		CreateOrganizationCommand request, CancellationToken cancellationToken)
	{
		var userExists = await _db.Users
			.AnyAsync(u => u.Id == request.CallerDomainUserId, cancellationToken);

		if (!userExists)
			return ServiceResponse<OrganizationDto>.Failure("Користувача не знайдено");

		if (!_currentUser.IsAdmin)
		{
			var maxOrganizationsForNonAdmin = await _systemSettings.GetMaxOwnedOrganizationsForNonAdminAsync(cancellationToken);
			var ownedOrganizationsCount = await _db.Organizations
				.CountAsync(o => o.OwnerUserId == request.CallerDomainUserId, cancellationToken);

			if (ownedOrganizationsCount >= maxOrganizationsForNonAdmin)
				return ServiceResponse<OrganizationDto>.Failure(
					$"Для звичайних користувачів доступно максимум {maxOrganizationsForNonAdmin} організацій");
		}

		var slug = await GenerateUniqueSlugAsync(request.Name, null, cancellationToken);

		var org = new Organization
		{
			Name = request.Name,
			Slug = slug,
			Description = request.Description,
			Website = request.Website,
			ContactEmail = request.ContactEmail,
			OwnerUserId = request.CallerDomainUserId
		};

		_orgRepo.Add(org);
		await _unitOfWork.SaveChangesAsync(cancellationToken);

		return ServiceResponse<OrganizationDto>.Success(new OrganizationDto(
			org.Id, org.Name, org.Slug, org.Description, StorageUrlResolver.Resolve(_fileStorage, org.LogoStorageKey),
			org.IsVerified, org.Website, org.ContactEmail, org.Phone, org.OwnerUserId, 1, org.CreatedAt, org.PlanType));
	}

	private async Task<string> GenerateUniqueSlugAsync(string name, Guid? excludeId, CancellationToken ct)
	{
		var baseSlug = SlugHelper.Generate(name);
		var slug = baseSlug;
		var counter = 1;

		while (await _orgRepo.SlugExistsAsync(slug, excludeId, ct))
		{
			slug = $"{baseSlug}-{counter++}";
		}

		return slug;
	}
}
