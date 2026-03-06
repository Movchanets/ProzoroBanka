using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.DeleteUser;

/// <summary>
/// Команда видалення користувача.
/// </summary>
public record DeleteUserCommand(
	Guid ApplicationUserId) : IRequest<ServiceResponse>;
