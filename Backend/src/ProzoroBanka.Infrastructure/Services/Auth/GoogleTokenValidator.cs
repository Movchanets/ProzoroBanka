using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Auth;

public class GoogleTokenValidator : IGoogleTokenValidator
{
	private readonly IConfiguration _configuration;
	private readonly ILogger<GoogleTokenValidator> _logger;

	public GoogleTokenValidator(IConfiguration configuration, ILogger<GoogleTokenValidator> logger)
	{
		_configuration = configuration;
		_logger = logger;
	}

	public async Task<ServiceResponse<GoogleTokenPayload>> ValidateAsync(string idToken, CancellationToken ct = default)
	{
		var googleClientId = _configuration["Google:ClientId"];
		if (string.IsNullOrWhiteSpace(googleClientId))
			return ServiceResponse<GoogleTokenPayload>.Failure("Google OAuth не налаштовано.");

		GoogleJsonWebSignature.Payload payload;
		try
		{
			payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
			{
				Audience = [googleClientId]
			});
		}
		catch (InvalidJwtException ex)
		{
			_logger.LogWarning(ex, "Invalid Google ID token received");
			return ServiceResponse<GoogleTokenPayload>.Failure("Невалідний Google токен.");
		}

		if (string.IsNullOrWhiteSpace(payload.Email))
			return ServiceResponse<GoogleTokenPayload>.Failure("Google акаунт не повернув email.");

		return ServiceResponse<GoogleTokenPayload>.Success(new GoogleTokenPayload(
			payload.Email.Trim(),
			payload.GivenName,
			payload.FamilyName,
			payload.Name));
	}
}