using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.ForgotPassword;

/// <summary>
/// Команда ініціації скидання пароля.
/// </summary>
public record ForgotPasswordCommand(
	string Email,
	string Origin) : IRequest<ServiceResponse>;
