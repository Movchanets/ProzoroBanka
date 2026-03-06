using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Queries.Profile;

/// <summary>
/// Запит на отримання профілю поточного користувача.
/// </summary>
public record GetProfileQuery(
	Guid ApplicationUserId) : IRequest<ServiceResponse<UserInfoDto>>;

/// <summary>
/// Handler для отримання профілю користувача.
/// </summary>
public class GetProfileHandler : IRequestHandler<GetProfileQuery, ServiceResponse<UserInfoDto>>
{
	private readonly IUserService _identityService;

	public GetProfileHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse<UserInfoDto>> Handle(
		GetProfileQuery request, CancellationToken cancellationToken)
	{
		var result = await _identityService.GetProfileAsync(
			request.ApplicationUserId, cancellationToken);

		if (!result.IsSuccess)
			return ServiceResponse<UserInfoDto>.Failure(result.Message);

		var profile = result.Payload!;
		return ServiceResponse<UserInfoDto>.Success(new UserInfoDto(
			profile.DomainUserId,
			profile.Email,
			profile.FirstName,
			profile.LastName,
			profile.ProfilePhotoUrl));
	}
}
