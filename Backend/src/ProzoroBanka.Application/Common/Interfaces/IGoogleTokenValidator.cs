using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

public interface IGoogleTokenValidator
{
	Task<ServiceResponse<GoogleTokenPayload>> ValidateAsync(string idToken, CancellationToken ct = default);
}

public sealed record GoogleTokenPayload(
	string Email,
	string? GivenName,
	string? FamilyName,
	string? FullName);