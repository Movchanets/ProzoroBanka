using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.LockUser;

/// <summary>
/// Handler для блокування/розблокування користувача.
/// </summary>
public class LockUserCommandHandler : IRequestHandler<LockUserCommand, ServiceResponse>
{
	private readonly IUserService _identityService;

	public LockUserCommandHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse> Handle(
		LockUserCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.SetLockoutAsync(
			request.ApplicationUserId, request.Lock, cancellationToken);
	}
}
