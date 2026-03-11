using FluentValidation;
using ProzoroBanka.Application.Auth.DTOs;

namespace ProzoroBanka.Application.Auth.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
	public RegisterRequestValidator()
	{
		RuleFor(x => x.Email)
			.NotEmpty().WithMessage("Email обов'язковий")
			.EmailAddress().WithMessage("Невалідний формат email")
			.MaximumLength(256);

		RuleFor(x => x.Password)
			.NotEmpty().WithMessage("Пароль обов'язковий")
			.MinimumLength(8).WithMessage("Пароль повинен містити мінімум 8 символів")
			.MaximumLength(128)
			.Matches("[A-Z]").WithMessage("Пароль повинен містити хоча б одну велику літеру")
			.Matches("[a-z]").WithMessage("Пароль повинен містити хоча б одну маленьку літеру")
			.Matches("[0-9]").WithMessage("Пароль повинен містити хоча б одну цифру")
			.Matches("[^a-zA-Z0-9]").WithMessage("Пароль повинен містити хоча б один спеціальний символ");

		RuleFor(x => x.ConfirmPassword)
			.Equal(x => x.Password).WithMessage("Паролі не співпадають");

		RuleFor(x => x.FirstName)
			.NotEmpty().WithMessage("Ім'я обов'язкове")
			.MaximumLength(100)
			.Matches(@"^[\p{L}\s\-']+$").WithMessage("Ім'я містить недопустимі символи");

		RuleFor(x => x.LastName)
			.NotEmpty().WithMessage("Прізвище обов'язкове")
			.MaximumLength(100)
			.Matches(@"^[\p{L}\s\-']+$").WithMessage("Прізвище містить недопустимі символи");

		RuleFor(x => x.TurnstileToken)
			.NotEmpty().WithMessage("Turnstile верифікація обов'язкова");
	}
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
	public LoginRequestValidator()
	{
		RuleFor(x => x.Email)
			.NotEmpty().WithMessage("Email обов'язковий")
			.EmailAddress().WithMessage("Невалідний формат email");

		RuleFor(x => x.Password)
			.NotEmpty().WithMessage("Пароль обов'язковий");

		RuleFor(x => x.TurnstileToken)
			.NotEmpty().WithMessage("Turnstile верифікація обов'язкова");
	}
}

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
	public ForgotPasswordRequestValidator()
	{
		RuleFor(x => x.Email)
			.NotEmpty().WithMessage("Email обов'язковий")
			.EmailAddress().WithMessage("Невалідний формат email");

		RuleFor(x => x.TurnstileToken)
			.NotEmpty().WithMessage("Turnstile верифікація обов'язкова");
	}
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
	public ResetPasswordRequestValidator()
	{
		RuleFor(x => x.Email)
			.NotEmpty().WithMessage("Email обов'язковий")
			.EmailAddress().WithMessage("Невалідний формат email");

		RuleFor(x => x.Token)
			.NotEmpty().WithMessage("Токен скидання пароля обов'язковий");

		RuleFor(x => x.NewPassword)
			.NotEmpty().WithMessage("Новий пароль обов'язковий")
			.MinimumLength(8).WithMessage("Пароль повинен містити мінімум 8 символів")
			.MaximumLength(128)
			.Matches("[A-Z]").WithMessage("Пароль повинен містити хоча б одну велику літеру")
			.Matches("[a-z]").WithMessage("Пароль повинен містити хоча б одну маленьку літеру")
			.Matches("[0-9]").WithMessage("Пароль повинен містити хоча б одну цифру")
			.Matches("[^a-zA-Z0-9]").WithMessage("Пароль повинен містити хоча б один спеціальний символ");

		RuleFor(x => x.ConfirmPassword)
			.Equal(x => x.NewPassword).WithMessage("Паролі не співпадають");
	}
}

public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
	public RefreshTokenRequestValidator()
	{
		RuleFor(x => x.AccessToken)
			.NotEmpty().WithMessage("Access token обов'язковий");

		RuleFor(x => x.RefreshToken)
			.NotEmpty().WithMessage("Refresh token обов'язковий");
	}
}

public class GoogleLoginRequestValidator : AbstractValidator<GoogleLoginRequest>
{
	public GoogleLoginRequestValidator()
	{
		RuleFor(x => x.IdToken)
			.NotEmpty().WithMessage("Google токен обов'язковий");

		RuleFor(x => x.TurnstileToken)
			.NotEmpty().WithMessage("Turnstile верифікація обов'язкова");
	}
}
