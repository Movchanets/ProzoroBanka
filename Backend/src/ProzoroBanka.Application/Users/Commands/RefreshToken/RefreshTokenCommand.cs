using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.RefreshToken;

/// <summary>
/// Команда оновлення токенів за refresh token.
/// </summary>
public record RefreshTokenCommand(
	string AccessToken,
	string RefreshToken) : IRequest<ServiceResponse<TokenResponse>>;
