using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Queries.GetAdminGeneralSettings;

public record GetAdminGeneralSettingsQuery() : IRequest<ServiceResponse<AdminGeneralSettingsDto>>;

public class GetAdminGeneralSettingsQueryHandler : IRequestHandler<GetAdminGeneralSettingsQuery, ServiceResponse<AdminGeneralSettingsDto>>
{
	private readonly ISystemSettingsService _systemSettings;

	public GetAdminGeneralSettingsQueryHandler(ISystemSettingsService systemSettings)
	{
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<AdminGeneralSettingsDto>> Handle(
		GetAdminGeneralSettingsQuery request,
		CancellationToken cancellationToken)
	{
		var maxOwned = await _systemSettings.GetMaxOwnedOrganizationsForNonAdminAsync(cancellationToken);
		var maxJoined = await _systemSettings.GetMaxJoinedOrganizationsForNonAdminAsync(cancellationToken);

		return ServiceResponse<AdminGeneralSettingsDto>.Success(new AdminGeneralSettingsDto(maxOwned, maxJoined));
	}
}
