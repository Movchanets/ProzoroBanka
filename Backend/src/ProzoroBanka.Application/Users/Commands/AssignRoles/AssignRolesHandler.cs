using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.AssignRoles;

/// <summary>
/// Handler для призначення ролей користувачу.
/// </summary>
public class AssignRolesHandler : IRequestHandler<AssignRolesCommand, ServiceResponse>
{
	private readonly IUserService _identityService;

	public AssignRolesHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse> Handle(
		AssignRolesCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.AssignRolesAsync(
			request.ApplicationUserId, request.Roles, cancellationToken);
	}
}
