using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IRegistryCredentialService
{
	Task<ServiceResponse> UpsertOrganizationKeyAsync(
		Guid organizationId,
		Guid actorUserId,
		RegistryProvider provider,
		string rawApiKey,
		CancellationToken ct);

	Task<ServiceResponse> DeleteOrganizationKeyAsync(
		Guid organizationId,
		Guid actorUserId,
		RegistryProvider provider,
		CancellationToken ct);

	Task<ServiceResponse<bool>> HasActiveKeyAsync(
		Guid organizationId,
		RegistryProvider provider,
		CancellationToken ct);

	Task<ServiceResponse<string>> DecryptApiKeyAsync(
		Guid organizationId,
		RegistryProvider provider,
		CancellationToken ct);
}