using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.UpdateAdminGeneralSettings;

public record UpdateAdminGeneralSettingsCommand(
	int MaxOwnedOrganizationsForNonAdmin,
	int MaxJoinedOrganizationsForNonAdmin) : IRequest<ServiceResponse<AdminGeneralSettingsDto>>;

public class UpdateAdminGeneralSettingsCommandValidator : AbstractValidator<UpdateAdminGeneralSettingsCommand>
{
	public UpdateAdminGeneralSettingsCommandValidator()
	{
		RuleFor(x => x.MaxOwnedOrganizationsForNonAdmin).GreaterThan(0).LessThanOrEqualTo(1000);
		RuleFor(x => x.MaxJoinedOrganizationsForNonAdmin).GreaterThan(0).LessThanOrEqualTo(1000);
	}
}

public class UpdateAdminGeneralSettingsCommandHandler : IRequestHandler<UpdateAdminGeneralSettingsCommand, ServiceResponse<AdminGeneralSettingsDto>>
{
	private readonly ISystemSettingsService _systemSettings;

	public UpdateAdminGeneralSettingsCommandHandler(ISystemSettingsService systemSettings)
	{
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<AdminGeneralSettingsDto>> Handle(
		UpdateAdminGeneralSettingsCommand request,
		CancellationToken cancellationToken)
	{
		await _systemSettings.SaveGeneralLimitsAsync(
			request.MaxOwnedOrganizationsForNonAdmin,
			request.MaxJoinedOrganizationsForNonAdmin,
			cancellationToken);

		return ServiceResponse<AdminGeneralSettingsDto>.Success(
			new AdminGeneralSettingsDto(request.MaxOwnedOrganizationsForNonAdmin, request.MaxJoinedOrganizationsForNonAdmin));
	}
}
