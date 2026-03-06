using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.RefreshToken;

/// <summary>
/// Handler для оновлення токенів.
/// </summary>
public class RefreshTokenHandler : IRequestHandler<RefreshTokenCommand, ServiceResponse<TokenResponse>>
{
	private readonly IUserService _identityService;

	public RefreshTokenHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse<TokenResponse>> Handle(
		RefreshTokenCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.RefreshTokenAsync(
			request.AccessToken, request.RefreshToken, cancellationToken);
	}
}
