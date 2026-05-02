using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.AuthenticateUser;

/// <summary>
/// Handler для автентифікації користувача.
/// </summary>
public class AuthenticateUserHandler : IRequestHandler<AuthenticateUserCommand, ServiceResponse<AuthResponse>>
{
	private readonly IUserService _identityService;

	public AuthenticateUserHandler(
		IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse<AuthResponse>> Handle(
		AuthenticateUserCommand request, CancellationToken cancellationToken)
	{
		// Логін через Identity
		var result = await _identityService.LoginAsync(
			request.Email, request.Password, cancellationToken);

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
