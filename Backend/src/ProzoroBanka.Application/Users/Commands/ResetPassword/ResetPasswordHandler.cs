using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.ResetPassword;

public class ResetPasswordHandler : IRequestHandler<ResetPasswordCommand, ServiceResponse>
{
	private readonly IUserService _identityService;

	public ResetPasswordHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
	{
		return await _identityService.ResetPasswordAsync(
			request.Email,
			request.Token,
			request.NewPassword,
			cancellationToken);
	}
}