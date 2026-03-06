using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.CreateRole;

/// <summary>
/// Handler для створення нової ролі.
/// </summary>
public class CreateRoleHandler : IRequestHandler<CreateRoleCommand, ServiceResponse>
{
	private readonly IUserService _identityService;

	public CreateRoleHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse> Handle(
		CreateRoleCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.CreateRoleAsync(
			request.RoleName, request.Description, cancellationToken);
	}
}
