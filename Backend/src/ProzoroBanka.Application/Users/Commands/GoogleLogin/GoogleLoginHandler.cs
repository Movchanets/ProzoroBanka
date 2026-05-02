using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.GoogleLogin;

/// <summary>
/// Handler для автентифікації через Google OAuth.
/// </summary>
public class GoogleLoginHandler : IRequestHandler<GoogleLoginCommand, ServiceResponse<AuthResponse>>
{
	private readonly IUserService _identityService;

	public GoogleLoginHandler(
		IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse<AuthResponse>> Handle(
		GoogleLoginCommand request, CancellationToken cancellationToken)
	{
		// Google login через Identity
		var result = await _identityService.GoogleLoginAsync(
			request.IdToken, cancellationToken);

		if (!result.IsSuccess)
			return ServiceResponse<AuthResponse>.Failure(result.Message);

		var auth = result.Payload!;
		return ServiceResponse<AuthResponse>.Success(new AuthResponse(
			auth.AccessToken,
			auth.RefreshToken,
			auth.AccessTokenExpiry,
			auth.RefreshTokenExpiry,
			new UserInfoDto(
				auth.DomainUserId,
				auth.Email,
				auth.FirstName,
				auth.LastName,
				auth.ProfilePhotoUrl)));
	}
}
