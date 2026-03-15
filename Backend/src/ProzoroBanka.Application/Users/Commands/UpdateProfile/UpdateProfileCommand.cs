using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Users.Commands.UpdateProfile;

public record UpdateProfileCommand(
	Guid ApplicationUserId,
	string FirstName,
	string LastName,
	string? PhoneNumber) : IRequest<ServiceResponse<UserProfileDto>>;

public class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
	public UpdateProfileCommandValidator()
	{
		RuleFor(x => x.ApplicationUserId)
			.NotEmpty();

		RuleFor(x => x.FirstName)
			.NotEmpty().WithMessage("Ім'я обов'язкове")
			.MaximumLength(100)
			.Matches(@"^[\p{L}\s\-']+$").WithMessage("Ім'я містить недопустимі символи");

		RuleFor(x => x.LastName)
			.NotEmpty().WithMessage("Прізвище обов'язкове")
			.MaximumLength(100)
			.Matches(@"^[\p{L}\s\-']+$").WithMessage("Прізвище містить недопустимі символи");

		RuleFor(x => x.PhoneNumber)
			.MaximumLength(32)
			.Matches(@"^\+?[0-9\s\-()]*$")
			.When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber))
			.WithMessage("Телефон містить недопустимі символи");
	}
}