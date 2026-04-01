using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Admin.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Admin.Commands.UpdateAdminPlansSettings;

public record UpdateAdminPlansSettingsCommand(
	AdminPlanLimitsDto Free,
	AdminPlanLimitsDto Paid) : IRequest<ServiceResponse<AdminPlansSettingsDto>>;

public class UpdateAdminPlansSettingsCommandValidator : AbstractValidator<UpdateAdminPlansSettingsCommand>
{
	public UpdateAdminPlansSettingsCommandValidator()
	{
		RuleFor(x => x.Free).NotNull();
		RuleFor(x => x.Paid).NotNull();
		RuleFor(x => x.Free.MaxCampaigns).GreaterThan(0).LessThanOrEqualTo(10000);
		RuleFor(x => x.Free.MaxMembers).GreaterThan(0).LessThanOrEqualTo(10000);
		RuleFor(x => x.Free.MaxOcrExtractionsPerMonth).GreaterThan(0).LessThanOrEqualTo(1000000);
		RuleFor(x => x.Paid.MaxCampaigns).GreaterThan(0).LessThanOrEqualTo(10000);
		RuleFor(x => x.Paid.MaxMembers).GreaterThan(0).LessThanOrEqualTo(10000);
		RuleFor(x => x.Paid.MaxOcrExtractionsPerMonth).GreaterThan(0).LessThanOrEqualTo(1000000);
	}
}

public class UpdateAdminPlansSettingsCommandHandler : IRequestHandler<UpdateAdminPlansSettingsCommand, ServiceResponse<AdminPlansSettingsDto>>
{
	private readonly ISystemSettingsService _systemSettings;

	public UpdateAdminPlansSettingsCommandHandler(ISystemSettingsService systemSettings)
	{
		_systemSettings = systemSettings;
	}

	public async Task<ServiceResponse<AdminPlansSettingsDto>> Handle(
		UpdateAdminPlansSettingsCommand request,
		CancellationToken cancellationToken)
	{
		await _systemSettings.SavePlanLimitsAsync(
			OrganizationPlanType.Free,
			new OrganizationPlanLimits
			{
				MaxCampaigns = request.Free.MaxCampaigns,
				MaxMembers = request.Free.MaxMembers,
				MaxOcrExtractionsPerMonth = request.Free.MaxOcrExtractionsPerMonth
			},
			cancellationToken);

		await _systemSettings.SavePlanLimitsAsync(
			OrganizationPlanType.Paid,
			new OrganizationPlanLimits
			{
				MaxCampaigns = request.Paid.MaxCampaigns,
				MaxMembers = request.Paid.MaxMembers,
				MaxOcrExtractionsPerMonth = request.Paid.MaxOcrExtractionsPerMonth
			},
			cancellationToken);

		return ServiceResponse<AdminPlansSettingsDto>.Success(new AdminPlansSettingsDto(request.Free, request.Paid));
	}
}
