using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.CreateRole;

/// <summary>
/// Команда створення нової ролі.
/// </summary>
public record CreateRoleCommand(
	string RoleName,
	string? Description = null) : IRequest<ServiceResponse>;
