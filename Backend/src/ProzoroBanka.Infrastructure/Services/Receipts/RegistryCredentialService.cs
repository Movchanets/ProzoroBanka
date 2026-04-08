using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class RegistryCredentialService : IRegistryCredentialService
{
	private readonly ApplicationDbContext _db;
	private readonly ITokenEncryptionService _encryption;

	public RegistryCredentialService(ApplicationDbContext db, ITokenEncryptionService encryption)
	{
		_db = db;
		_encryption = encryption;
	}

	public async Task<ServiceResponse> UpsertOrganizationKeyAsync(Guid organizationId, Guid actorUserId, RegistryProvider provider, string rawApiKey, CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(rawApiKey))
			return ServiceResponse.Failure("API ключ не може бути порожнім");

		var credential = await _db.OrganizationStateRegistryCredentials
			.FirstOrDefaultAsync(x => x.OrganizationId == organizationId && x.Provider == provider, ct);

		if (credential is null)
		{
			credential = new OrganizationStateRegistryCredential
			{
				OrganizationId = organizationId,
				CreatedByUserId = actorUserId,
				Provider = provider,
				EncryptedApiKey = _encryption.Encrypt(rawApiKey.Trim()),
				KeyFingerprint = BuildFingerprint(rawApiKey),
				IsActive = true,
				LastValidatedAtUtc = null,
				LastUsedAtUtc = null
			};
			_db.OrganizationStateRegistryCredentials.Add(credential);
		}
		else
		{
			credential.EncryptedApiKey = _encryption.Encrypt(rawApiKey.Trim());
			credential.KeyFingerprint = BuildFingerprint(rawApiKey);
			credential.IsActive = true;
			credential.BlockedUntilUtc = null;
		}

		await _db.SaveChangesAsync(ct);
		return ServiceResponse.Success("Ключ державного реєстру збережено");
	}

	public async Task<ServiceResponse> DeleteOrganizationKeyAsync(Guid organizationId, Guid actorUserId, RegistryProvider provider, CancellationToken ct)
	{
		var credential = await _db.OrganizationStateRegistryCredentials
			.FirstOrDefaultAsync(x => x.OrganizationId == organizationId && x.Provider == provider, ct);
		if (credential is null)
			return ServiceResponse.Failure("Ключ не знайдено");

		credential.IsDeleted = true;
		credential.IsActive = false;
		await _db.SaveChangesAsync(ct);
		return ServiceResponse.Success("Ключ видалено");
	}

	public async Task<ServiceResponse<bool>> HasActiveKeyAsync(Guid organizationId, RegistryProvider provider, CancellationToken ct)
	{
		var exists = await _db.OrganizationStateRegistryCredentials
			.AnyAsync(x => x.OrganizationId == organizationId
				&& x.Provider == provider
				&& x.IsActive
				&& !x.IsDeleted,
				ct);

		return ServiceResponse<bool>.Success(exists);
	}

	public async Task<ServiceResponse<string>> DecryptApiKeyAsync(Guid organizationId, RegistryProvider provider, CancellationToken ct)
	{
		var credential = await _db.OrganizationStateRegistryCredentials
			.FirstOrDefaultAsync(x => x.OrganizationId == organizationId && x.Provider == provider && x.IsActive, ct);

		if (credential is null)
			return ServiceResponse<string>.Failure("Активний ключ не знайдено");

		return ServiceResponse<string>.Success(_encryption.Decrypt(credential.EncryptedApiKey));
	}

	private static string BuildFingerprint(string key)
	{
		var trimmed = key.Trim();
		if (trimmed.Length <= 16)
			return trimmed;

		return trimmed[^16..];
	}
}
