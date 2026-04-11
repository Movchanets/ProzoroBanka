using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationPlanUsage;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Organizations.Queries.GetOrganizationStateRegistrySettings;

public record GetOrganizationStateRegistrySettingsQuery(
	Guid CallerDomainUserId,
	Guid OrganizationId) : IRequest<ServiceResponse<OrganizationStateRegistrySettingsDto>>;

public class GetOrganizationStateRegistrySettingsHandler
	: IRequestHandler<GetOrganizationStateRegistrySettingsQuery, ServiceResponse<OrganizationStateRegistrySettingsDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _organizationAuthorizationService;
	private readonly ISender _sender;

	public GetOrganizationStateRegistrySettingsHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService organizationAuthorizationService,
		ISender sender)
	{
		_db = db;
		_organizationAuthorizationService = organizationAuthorizationService;
		_sender = sender;
	}

	public async Task<ServiceResponse<OrganizationStateRegistrySettingsDto>> Handle(
		GetOrganizationStateRegistrySettingsQuery request,
		CancellationToken cancellationToken)
	{
		var isMember = await _organizationAuthorizationService.IsMember(
			request.OrganizationId,
			request.CallerDomainUserId,
			cancellationToken);

		if (!isMember)
			return ServiceResponse<OrganizationStateRegistrySettingsDto>.Failure("Користувач не є учасником організації");

		var canManage = await _organizationAuthorizationService.HasPermission(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManageOrganization,
			cancellationToken);

		var credentials = await _db.OrganizationStateRegistryCredentials
			.AsNoTracking()
			.Where(x => x.OrganizationId == request.OrganizationId && !x.IsDeleted)
			.ToListAsync(cancellationToken);

		var usageResult = await _sender.Send(new GetOrganizationPlanUsageQuery(request.OrganizationId), cancellationToken);
		if (!usageResult.IsSuccess || usageResult.Payload is null)
			return ServiceResponse<OrganizationStateRegistrySettingsDto>.Failure(usageResult.Message);

		var tax = canManage
			? BuildCredentialSummary(credentials, RegistryProvider.TaxService, RegistryProvider.CheckGovUa)
			: BuildRestrictedSummary(RegistryProvider.TaxService);
		var checkGov = canManage
			? BuildCredentialSummary(credentials, RegistryProvider.CheckGovUa, RegistryProvider.TaxService)
			: BuildRestrictedSummary(RegistryProvider.CheckGovUa);
		var stateConfiguredKeys = credentials.Any(x => x.IsActive) ? 1 : 0;

		return ServiceResponse<OrganizationStateRegistrySettingsDto>.Success(new OrganizationStateRegistrySettingsDto(
			tax,
			checkGov,
			stateConfiguredKeys,
			1,
			usageResult.Payload.CurrentOcrExtractionsPerMonth,
			usageResult.Payload.MaxOcrExtractionsPerMonth));
	}

	private static StateRegistryCredentialSummaryDto BuildRestrictedSummary(RegistryProvider provider)
		=> new(
			provider,
			false,
			null,
			null,
			null);

	private static StateRegistryCredentialSummaryDto BuildCredentialSummary(
		IReadOnlyCollection<ProzoroBanka.Domain.Entities.OrganizationStateRegistryCredential> credentials,
		RegistryProvider provider,
		RegistryProvider fallbackProvider)
	{
		var credential = credentials
			.Where(x => x.Provider == provider || x.Provider == fallbackProvider)
			.OrderByDescending(x => x.UpdatedAt)
			.FirstOrDefault();

		if (credential is null || !credential.IsActive)
		{
			return new StateRegistryCredentialSummaryDto(
				provider,
				false,
				null,
				null,
				null);
		}

		return new StateRegistryCredentialSummaryDto(
			provider,
			true,
			MaskFingerprint(credential.KeyFingerprint),
			credential.LastValidatedAtUtc,
			credential.LastUsedAtUtc);
	}

	private static string MaskFingerprint(string fingerprint)
	{
		if (string.IsNullOrWhiteSpace(fingerprint))
			return "********";

		var normalized = fingerprint.Trim();
		var suffix = normalized.Length > 4 ? normalized[^4..] : normalized;
		return $"********{suffix}";
	}
}