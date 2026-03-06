using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.LogoutUser;

/// <summary>
/// Команда виходу (відкликання refresh token).
/// </summary>
public record LogoutUserCommand(
	Guid ApplicationUserId) : IRequest<ServiceResponse>;

/// <summary>
/// Handler для виходу користувача.
/// </summary>
public class LogoutUserHandler : IRequestHandler<LogoutUserCommand, ServiceResponse>
{
	private readonly IUserService _identityService;

	public LogoutUserHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse> Handle(
		LogoutUserCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.LogoutAsync(
			request.ApplicationUserId, cancellationToken);
	}
}
