using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.RegisterUser;

/// <summary>
/// Handler для реєстрації нового користувача.
/// </summary>
public class RegisterUserHandler : IRequestHandler<RegisterUserCommand, ServiceResponse<AuthResponse>>
{
	private readonly IUserService _identityService;

	public RegisterUserHandler(
		IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse<AuthResponse>> Handle(
		RegisterUserCommand request, CancellationToken cancellationToken)
	{
		// Реєстрація через Identity
		var result = await _identityService.RegisterAsync(
			request.Email, request.Password, request.FirstName, request.LastName, cancellationToken);

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
