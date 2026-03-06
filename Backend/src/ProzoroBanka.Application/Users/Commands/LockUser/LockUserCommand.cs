using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.LockUser;

/// <summary>
/// Команда блокування/розблокування користувача.
/// </summary>
public record LockUserCommand(
	Guid ApplicationUserId,
	bool Lock) : IRequest<ServiceResponse>;
