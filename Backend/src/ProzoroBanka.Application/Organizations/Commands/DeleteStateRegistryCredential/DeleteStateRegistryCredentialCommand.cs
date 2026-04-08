using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.DeleteStateRegistryCredential;

public record DeleteStateRegistryCredentialCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	RegistryProvider Provider) : IRequest<ServiceResponse>;

public class DeleteStateRegistryCredentialCommandValidator : AbstractValidator<DeleteStateRegistryCredentialCommand>
{
	public DeleteStateRegistryCredentialCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
	}
}

public class DeleteStateRegistryCredentialCommandHandler
	: IRequestHandler<DeleteStateRegistryCredentialCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _organizationAuthorizationService;
	private readonly IRegistryCredentialService _registryCredentialService;

	public DeleteStateRegistryCredentialCommandHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService organizationAuthorizationService,
		IRegistryCredentialService registryCredentialService)
	{
		_db = db;
		_organizationAuthorizationService = organizationAuthorizationService;
		_registryCredentialService = registryCredentialService;
	}

	public async Task<ServiceResponse> Handle(
		DeleteStateRegistryCredentialCommand request,
		CancellationToken cancellationToken)
	{
		var organizationExists = await _db.Organizations
			.AsNoTracking()
			.AnyAsync(x => x.Id == request.OrganizationId && !x.IsDeleted, cancellationToken);

		if (!organizationExists)
			return ServiceResponse.Failure("Організацію не знайдено");

		var canManage = await _organizationAuthorizationService.HasPermission(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManageOrganization,
			cancellationToken);

		if (!canManage)
			return ServiceResponse.Failure("Недостатньо прав для керування ключами організації");

		return await _registryCredentialService.DeleteOrganizationKeyAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			request.Provider,
			cancellationToken);
	}
}