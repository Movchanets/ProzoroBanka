using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.AuthenticateUser;

/// <summary>
/// Команда автентифікації користувача за email/паролем.
/// </summary>
public record AuthenticateUserCommand(
	string Email,
	string Password) : IRequest<ServiceResponse<AuthResponse>>;
