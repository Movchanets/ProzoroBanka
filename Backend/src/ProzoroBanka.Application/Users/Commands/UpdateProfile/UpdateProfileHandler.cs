using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.UpdateProfile;

public class UpdateProfileHandler : IRequestHandler<UpdateProfileCommand, ServiceResponse<UserProfileDto>>
{
	private readonly IUserService _userService;

	public UpdateProfileHandler(IUserService userService)
	{
		_userService = userService;
	}

	public async Task<ServiceResponse<UserProfileDto>> Handle(
		UpdateProfileCommand request,
		CancellationToken cancellationToken)
	{
		var result = await _userService.UpdateProfileAsync(
			request.ApplicationUserId,
			request.FirstName,
			request.LastName,
			request.PhoneNumber,
			cancellationToken);

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