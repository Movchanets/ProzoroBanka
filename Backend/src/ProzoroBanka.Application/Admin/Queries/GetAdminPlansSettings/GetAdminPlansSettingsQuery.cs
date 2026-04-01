using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Admin.Queries.GetAdminPlansSettings;

public record GetAdminPlansSettingsQuery() : IRequest<ServiceResponse<AdminPlansSettingsDto>>;

public class GetAdminPlansSettingsQueryHandler : IRequestHandler<GetAdminPlansSettingsQuery, ServiceResponse<AdminPlansSettingsDto>>
{
	private readonly ISystemSettingsService _systemSettings;

	public GetAdminPlansSettingsQueryHandler(ISystemSettingsService systemSettings)
	{
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<AdminPlansSettingsDto>> Handle(
		GetAdminPlansSettingsQuery request,
		CancellationToken cancellationToken)
	{
		var free = await _systemSettings.GetPlanLimitsAsync(OrganizationPlanType.Free, cancellationToken);
		var paid = await _systemSettings.GetPlanLimitsAsync(OrganizationPlanType.Paid, cancellationToken);

		return ServiceResponse<AdminPlansSettingsDto>.Success(new AdminPlansSettingsDto(
			new AdminPlanLimitsDto(free.MaxCampaigns, free.MaxMembers, free.MaxOcrExtractionsPerMonth),
			new AdminPlanLimitsDto(paid.MaxCampaigns, paid.MaxMembers, paid.MaxOcrExtractionsPerMonth)));
	}
}
