using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.ForgotPassword;

/// <summary>
/// Handler для ініціації скидання пароля.
/// </summary>
public class ForgotPasswordHandler : IRequestHandler<ForgotPasswordCommand, ServiceResponse>
{
	private readonly IUserService _identityService;

	public ForgotPasswordHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse> Handle(
		ForgotPasswordCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.ForgotPasswordAsync(
			request.Email, request.Origin, cancellationToken);
	}
}
