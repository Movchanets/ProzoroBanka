using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Queries.Profile;

/// <summary>
/// Запит на отримання профілю поточного користувача.
/// </summary>
public record GetProfileQuery(
	Guid ApplicationUserId) : IRequest<ServiceResponse<UserProfileDto>>;

/// <summary>
/// Handler для отримання профілю користувача.
/// </summary>
public class GetProfileHandler : IRequestHandler<GetProfileQuery, ServiceResponse<UserProfileDto>>
{
	private readonly IUserService _identityService;

	public GetProfileHandler(IUserService identityService)
	{
		_identityService = identityService;
	}

	public async Task<ServiceResponse<UserProfileDto>> Handle(
		GetProfileQuery request, CancellationToken cancellationToken)
	{
		var result = await _identityService.GetProfileAsync(
			request.ApplicationUserId, cancellationToken);

		if (!result.IsSuccess)
			return ServiceResponse<UserProfileDto>.Failure(result.Message);

		var profile = result.Payload!;
		return ServiceResponse<UserProfileDto>.Success(new UserProfileDto(
			profile.DomainUserId,
			profile.Email,
			profile.FirstName,
			profile.LastName,
			profile.PhoneNumber,
			profile.ProfilePhotoUrl,
			profile.Roles));
	}
}
