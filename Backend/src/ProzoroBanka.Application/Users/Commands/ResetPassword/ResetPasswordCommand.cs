using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.ResetPassword;

public record ResetPasswordCommand(
	string Email,
	string Token,
	string NewPassword,
	string ConfirmPassword) : IRequest<ServiceResponse>;