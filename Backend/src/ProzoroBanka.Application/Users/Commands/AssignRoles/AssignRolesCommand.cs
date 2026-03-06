using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.AssignRoles;

/// <summary>
/// Команда призначення ролей користувачу.
/// </summary>
public record AssignRolesCommand(
	Guid ApplicationUserId,
	IEnumerable<string> Roles) : IRequest<ServiceResponse>;
