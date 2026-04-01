using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetUserLimitsSettings;

public record GetUserLimitsSettingsQuery() : IRequest<ServiceResponse<AdminUserLimitsSettingsDto>>;

public class GetUserLimitsSettingsQueryHandler
	: IRequestHandler<GetUserLimitsSettingsQuery, ServiceResponse<AdminUserLimitsSettingsDto>>
{
	private readonly ISystemSettingsService _systemSettings;

	public GetUserLimitsSettingsQueryHandler(ISystemSettingsService systemSettings)
	{
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<AdminUserLimitsSettingsDto>> Handle(
		GetUserLimitsSettingsQuery request,
		CancellationToken cancellationToken)
	{
		var value = await _systemSettings.GetMaxOwnedOrganizationsForNonAdminAsync(cancellationToken);

		return ServiceResponse<AdminUserLimitsSettingsDto>.Success(new AdminUserLimitsSettingsDto(value));
	}
}
