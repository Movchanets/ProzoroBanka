using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using Microsoft.IdentityModel.Tokens;

namespace ProzoroBanka.Application.Users.Commands.ImpersonateUser;

public record ImpersonateUserCommand(Guid TargetUserId) : IRequest<ServiceResponse<TokenResponse>>;

public class ImpersonateUserCommandHandler : IRequestHandler<ImpersonateUserCommand, ServiceResponse<TokenResponse>>
{
	private readonly ITokenService _tokenService;

	public ImpersonateUserCommandHandler(ITokenService tokenService)
	{
		_tokenService = tokenService;
	}

	public async Task<ServiceResponse<TokenResponse>> Handle(ImpersonateUserCommand request, CancellationToken cancellationToken)
	{
		try
		{
			var tokens = await _tokenService.GenerateTokensForUserAsync(request.TargetUserId, cancellationToken);
			return ServiceResponse<TokenResponse>.Success(tokens);
		}
		catch (SecurityTokenException ex)
		{
			return ServiceResponse<TokenResponse>.Failure(ex.Message);
		}
	}
}