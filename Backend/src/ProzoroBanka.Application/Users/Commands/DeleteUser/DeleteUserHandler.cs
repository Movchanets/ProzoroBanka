using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.DeleteUser;

/// <summary>
/// Handler для видалення користувача.
/// </summary>
public class DeleteUserHandler : IRequestHandler<DeleteUserCommand, ServiceResponse>
{
	private readonly IUserService _identityService;

	public DeleteUserHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse> Handle(
		DeleteUserCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.DeleteUserAsync(
			request.ApplicationUserId, cancellationToken);
	}
}
