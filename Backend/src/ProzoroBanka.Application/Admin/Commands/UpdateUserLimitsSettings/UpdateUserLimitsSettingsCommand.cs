using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.UpdateUserLimitsSettings;

public record UpdateUserLimitsSettingsCommand(
	int MaxOwnedOrganizationsForNonAdmin) : IRequest<ServiceResponse<AdminUserLimitsSettingsDto>>;

public class UpdateUserLimitsSettingsCommandValidator : AbstractValidator<UpdateUserLimitsSettingsCommand>
{
	public UpdateUserLimitsSettingsCommandValidator()
	{
		RuleFor(x => x.MaxOwnedOrganizationsForNonAdmin)
			.GreaterThan(0)
			.LessThanOrEqualTo(1000);
	}
}

public class UpdateUserLimitsSettingsCommandHandler
	: IRequestHandler<UpdateUserLimitsSettingsCommand, ServiceResponse<AdminUserLimitsSettingsDto>>
{
	private readonly ISystemSettingsService _systemSettings;

	public UpdateUserLimitsSettingsCommandHandler(ISystemSettingsService systemSettings)
	{
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<AdminUserLimitsSettingsDto>> Handle(
		UpdateUserLimitsSettingsCommand request,
		CancellationToken cancellationToken)
	{
		var currentMaxJoined = await _systemSettings.GetMaxJoinedOrganizationsForNonAdminAsync(cancellationToken);

		await _systemSettings.SaveGeneralLimitsAsync(
			request.MaxOwnedOrganizationsForNonAdmin,
			currentMaxJoined,
			cancellationToken);

		return ServiceResponse<AdminUserLimitsSettingsDto>.Success(
			new AdminUserLimitsSettingsDto(request.MaxOwnedOrganizationsForNonAdmin));
	}
}
