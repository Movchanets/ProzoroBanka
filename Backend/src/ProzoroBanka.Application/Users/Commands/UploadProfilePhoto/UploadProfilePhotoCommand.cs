using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.UploadProfilePhoto;

public record UploadProfilePhotoCommand(
	Guid ApplicationUserId,
	Stream FileStream,
	string FileName,
	string ContentType,
	long FileSize) : IRequest<ServiceResponse<UserProfileDto>>;

public class UploadProfilePhotoCommandValidator : AbstractValidator<UploadProfilePhotoCommand>
{
	private static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

	public UploadProfilePhotoCommandValidator()
	{
		RuleFor(x => x.ApplicationUserId)
			.NotEmpty();

		RuleFor(x => x.FileName)
			.NotEmpty().WithMessage("Файл зображення обов'язковий");

		RuleFor(x => x.FileSize)
			.GreaterThan(0).WithMessage("Файл зображення обов'язковий")
			.LessThanOrEqualTo(5 * 1024 * 1024).WithMessage("Максимальний розмір зображення — 5 MB");

		RuleFor(x => x.ContentType)
			.Must(contentType => AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
			.WithMessage("Підтримуються лише JPEG, PNG, WEBP або GIF");
	}
}