using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Commands.UpsertStateRegistryCredential;

public record UpsertStateRegistryCredentialCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	RegistryProvider Provider,
	string ApiKey) : IRequest<ServiceResponse>;

public class UpsertStateRegistryCredentialCommandValidator : AbstractValidator<UpsertStateRegistryCredentialCommand>
{
	public UpsertStateRegistryCredentialCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();
		RuleFor(x => x.ApiKey)
			.NotEmpty().WithMessage("API ключ не може бути порожнім")
			.MaximumLength(4096).WithMessage("API ключ завеликий");
	}
}

public class UpsertStateRegistryCredentialCommandHandler
	: IRequestHandler<UpsertStateRegistryCredentialCommand, ServiceResponse>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _organizationAuthorizationService;
	private readonly IRegistryCredentialService _registryCredentialService;

	public UpsertStateRegistryCredentialCommandHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService organizationAuthorizationService,
		IRegistryCredentialService registryCredentialService)
	{
		_db = db;
		_organizationAuthorizationService = organizationAuthorizationService;
		_registryCredentialService = registryCredentialService;
	}

	public async Task<ServiceResponse> Handle(
		UpsertStateRegistryCredentialCommand request,
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

		return await _registryCredentialService.UpsertOrganizationKeyAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			request.Provider,
			request.ApiKey,
			cancellationToken);
	}
}