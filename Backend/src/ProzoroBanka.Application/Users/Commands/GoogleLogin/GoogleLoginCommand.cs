using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.GoogleLogin;

/// <summary>
/// Команда автентифікації через Google OAuth.
/// </summary>
public record GoogleLoginCommand(
	string IdToken) : IRequest<ServiceResponse<AuthResponse>>;
