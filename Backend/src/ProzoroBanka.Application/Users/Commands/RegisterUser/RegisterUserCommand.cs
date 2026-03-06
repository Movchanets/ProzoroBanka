using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.RegisterUser;

/// <summary>
/// Команда реєстрації нового користувача.
/// </summary>
public record RegisterUserCommand(
	string Email,
	string Password,
	string ConfirmPassword,
	string FirstName,
	string LastName) : IRequest<ServiceResponse<AuthResponse>>;
