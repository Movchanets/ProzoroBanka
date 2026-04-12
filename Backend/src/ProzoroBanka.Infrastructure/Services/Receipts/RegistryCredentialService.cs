using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class RegistryCredentialService : IRegistryCredentialService
{
	private const RegistryProvider CanonicalProvider = RegistryProvider.TaxService;
	private const string ProviderUniqueConstraint = "IX_OrganizationStateRegistryCredentials_OrganizationId_Provider";

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

		var normalizedApiKey = rawApiKey.Trim();
		var encryptedApiKey = _encryption.Encrypt(normalizedApiKey);
		var keyFingerprint = BuildFingerprint(normalizedApiKey);

		try
		{
			await ApplyCredentialUpsertAsync(
				organizationId,
				actorUserId,
				provider,
				encryptedApiKey,
				keyFingerprint,
				ct);
		}
		catch (DbUpdateException ex) when (IsProviderUniqueViolation(ex))
		{
			// Concurrent requests can race on insert; reloading and updating existing row resolves it deterministically.
			_db.ChangeTracker.Clear();
			await ApplyCredentialUpsertAsync(
				organizationId,
				actorUserId,
				provider,
				encryptedApiKey,
				keyFingerprint,
				ct);
		}

		return ServiceResponse.Success("Ключ державного реєстру збережено");
	}

	private async Task ApplyCredentialUpsertAsync(
		Guid organizationId,
		Guid actorUserId,
		RegistryProvider provider,
		string encryptedApiKey,
		string keyFingerprint,
		CancellationToken ct)
	{

		var credentials = await _db.OrganizationStateRegistryCredentials
			.IgnoreQueryFilters()
			.Where(x => x.OrganizationId == organizationId
				&& (x.Provider == CanonicalProvider || x.Provider == provider))
			.ToListAsync(ct);

		var credential = credentials.FirstOrDefault(x => x.Provider == CanonicalProvider)
			?? credentials.FirstOrDefault(x => x.Provider == provider);

		if (credential is null)
		{
			credential = new OrganizationStateRegistryCredential
			{
				OrganizationId = organizationId,
				CreatedByUserId = actorUserId,
				Provider = CanonicalProvider,
				EncryptedApiKey = encryptedApiKey,
				KeyFingerprint = keyFingerprint,
				IsActive = true,
				IsDeleted = false,
				LastValidatedAtUtc = null,
				LastUsedAtUtc = null
			};
			_db.OrganizationStateRegistryCredentials.Add(credential);
		}
		else
		{
			credential.Provider = CanonicalProvider;
			credential.EncryptedApiKey = encryptedApiKey;
			credential.KeyFingerprint = keyFingerprint;
			credential.IsActive = true;
			credential.IsDeleted = false;
			credential.BlockedUntilUtc = null;
		}

		foreach (var duplicate in credentials.Where(x => x.Id != credential.Id))
		{
			duplicate.IsDeleted = true;
			duplicate.IsActive = false;
		}

		await _db.SaveChangesAsync(ct);
	}

	private static bool IsProviderUniqueViolation(DbUpdateException ex)
	{
		if (ex.InnerException is not PostgresException pgException)
			return false;

		return pgException.SqlState == PostgresErrorCodes.UniqueViolation
			&& string.Equals(pgException.ConstraintName, ProviderUniqueConstraint, StringComparison.Ordinal);
	}

	public async Task<ServiceResponse> DeleteOrganizationKeyAsync(Guid organizationId, Guid actorUserId, RegistryProvider provider, CancellationToken ct)
	{
		var credentials = await _db.OrganizationStateRegistryCredentials
			.Where(x => x.OrganizationId == organizationId
				&& !x.IsDeleted
				&& (x.Provider == CanonicalProvider || x.Provider == provider))
			.ToListAsync(ct);

		if (credentials.Count == 0)
			return ServiceResponse.Failure("Ключ не знайдено");

		foreach (var credential in credentials)
		{
			credential.IsDeleted = true;
			credential.IsActive = false;
		}

		await _db.SaveChangesAsync(ct);
		return ServiceResponse.Success("Ключ видалено");
	}

	public async Task<ServiceResponse<bool>> HasActiveKeyAsync(Guid organizationId, RegistryProvider provider, CancellationToken ct)
	{
		var exists = await _db.OrganizationStateRegistryCredentials
			.AnyAsync(x => x.OrganizationId == organizationId
				&& x.Provider == CanonicalProvider
				&& x.IsActive
				&& !x.IsDeleted,
				ct);

		if (!exists && provider != CanonicalProvider)
		{
			exists = await _db.OrganizationStateRegistryCredentials
				.AnyAsync(x => x.OrganizationId == organizationId
					&& x.Provider == provider
					&& x.IsActive
					&& !x.IsDeleted,
					ct);
		}

		return ServiceResponse<bool>.Success(exists);
	}

	public async Task<ServiceResponse<string>> DecryptApiKeyAsync(Guid organizationId, RegistryProvider provider, CancellationToken ct)
	{
		var credential = await _db.OrganizationStateRegistryCredentials
			.FirstOrDefaultAsync(x => x.OrganizationId == organizationId
				&& x.Provider == CanonicalProvider
				&& x.IsActive
				&& !x.IsDeleted,
				ct);

		if (credential is null && provider != CanonicalProvider)
		{
			credential = await _db.OrganizationStateRegistryCredentials
				.FirstOrDefaultAsync(x => x.OrganizationId == organizationId
					&& x.Provider == provider
					&& x.IsActive
					&& !x.IsDeleted,
					ct);
		}

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
