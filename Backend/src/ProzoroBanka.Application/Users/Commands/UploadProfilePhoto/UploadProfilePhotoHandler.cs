using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.UploadProfilePhoto;

public class UploadProfilePhotoHandler : IRequestHandler<UploadProfilePhotoCommand, ServiceResponse<UserProfileDto>>
{
	private readonly IUserService _userService;

	public UploadProfilePhotoHandler(IUserService userService)
	{
		_userService = userService;
	}

	public async Task<ServiceResponse<UserProfileDto>> Handle(
		UploadProfilePhotoCommand request,
		CancellationToken cancellationToken)
	{
		await using var fileStream = request.FileStream;

		var result = await _userService.UpdateProfilePhotoAsync(
			request.ApplicationUserId,
			fileStream,
			request.FileName,
			request.ContentType,
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