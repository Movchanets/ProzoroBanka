using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProzoroBanka.API.Authorization;
using ProzoroBanka.API.Filters;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Users.Commands.AuthenticateUser;
using ProzoroBanka.Application.Users.Commands.ForgotPassword;
using ProzoroBanka.Application.Users.Commands.GoogleLogin;
using ProzoroBanka.Application.Users.Commands.RefreshToken;
using ProzoroBanka.Application.Users.Commands.RegisterUser;
using ProzoroBanka.Application.Users.Commands.ResetPassword;
using ProzoroBanka.Application.Users.Commands.UpdateProfile;
using ProzoroBanka.Application.Users.Commands.UploadProfilePhoto;
using ProzoroBanka.Application.Users.Queries.Profile;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// Автентифікація та авторизація (Register / Login / Refresh / Logout / Google / Me).
/// Тонкий контролер — вся бізнес-логіка делегується MediatR handlers.
/// </summary>
[ServiceFilter(typeof(TurnstileValidationFilter))]
public class AuthController : ApiControllerBase
{
	private readonly ISender _sender;
	private readonly IConfiguration _configuration;

	public AuthController(ISender sender, IConfiguration configuration)
	{
		_sender = sender;
		_configuration = configuration;
	}

	/// <summary>
	/// Реєстрація нового користувача.
	/// </summary>
	[HttpPost("register")]
	[ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
	{
		var command = new RegisterUserCommand(
			request.Email,
			request.Password,
			request.ConfirmPassword,
			request.FirstName,
			request.LastName);

		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: BadRequest(new { Error = result.Message });
	}

	/// <summary>
	/// Вхід за логіном та паролем.
	/// </summary>
	[HttpPost("login")]
	[ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status401Unauthorized)]
	public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
	{
		var command = new AuthenticateUserCommand(
			request.Email,
			request.Password);

		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: Unauthorized(new { Error = result.Message });
	}

	/// <summary>
	/// Оновлення токенів за допомогою refresh token.
	/// </summary>
	[HttpPost("refresh")]
	[ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status401Unauthorized)]
	public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
	{
		var command = new RefreshTokenCommand(request.AccessToken, request.RefreshToken);
		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: Unauthorized(new { Error = result.Message });
	}

	/// <summary>
	/// Вхід через Google OAuth.
	/// </summary>
	[HttpPost("google")]
	[ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request, CancellationToken ct)
	{
		var command = new GoogleLoginCommand(request.IdToken);

		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: BadRequest(new { Error = result.Message });
	}

	/// <summary>
	/// Ініціація скидання пароля.
	/// </summary>
	[HttpPost("forgot-password")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
	{
		var origin = Request.Headers.Origin.FirstOrDefault();

		if (string.IsNullOrWhiteSpace(origin))
		{
			var referer = Request.Headers.Referer.FirstOrDefault();
			if (Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
				origin = $"{refererUri.Scheme}://{refererUri.Authority}";
		}

		if (string.IsNullOrWhiteSpace(origin))
			origin = _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault();

		if (string.IsNullOrWhiteSpace(origin))
			origin = $"{Request.Scheme}://{Request.Host}";

		var command = new ForgotPasswordCommand(request.Email, origin!);
		var result = await _sender.Send(command, ct);

		return result.IsSuccess
			? Ok(new { Message = result.Message })
			: BadRequest(new { Error = result.Message });
	}

	/// <summary>
	/// Підтвердження скидання пароля за токеном.
	/// </summary>
	[HttpPost("reset-password")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
	{
		var command = new ResetPasswordCommand(
			request.Email,
			request.Token,
			request.NewPassword,
			request.ConfirmPassword);

		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(new { Message = result.Message })
			: BadRequest(new { Error = result.Message });
	}

	/// <summary>
	/// Вихід — відкликання refresh token.
	/// </summary>
	[Authorize]
	[HttpPost("logout")]
	[ProducesResponseType(StatusCodes.Status204NoContent)]
	public async Task<IActionResult> Logout(CancellationToken ct)
	{
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
		if (userId is null)
			return Unauthorized();

		var command = new Application.Users.Commands.LogoutUser.LogoutUserCommand(Guid.Parse(userId));
		var result = await _sender.Send(command, ct);
		return result.IsSuccess ? NoContent() : BadRequest(new { Error = result.Message });
	}

	/// <summary>
	/// Отримання інформації про поточного користувача.
	/// </summary>
	[Authorize]
	[HttpGet("me")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
	public async Task<IActionResult> Me(CancellationToken ct)
	{
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
		if (userId is null)
			return Unauthorized();

		var query = new GetProfileQuery(Guid.Parse(userId));
		var result = await _sender.Send(query, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: NotFound(new { Error = result.Message });
	}

	/// <summary>
	/// Оновлення базових даних профілю поточного користувача.
	/// </summary>
	[Authorize]
	[HttpPut("me")]
	[HasPermission(Permissions.UsersSelf)]
	[ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
	{
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
		if (userId is null)
			return Unauthorized();

		var command = new UpdateProfileCommand(
			Guid.Parse(userId),
			request.FirstName,
			request.LastName,
			request.PhoneNumber);

		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: BadRequest(new { Error = result.Message });
	}

	/// <summary>
	/// Завантаження або оновлення фото профілю.
	/// </summary>
	[Authorize]
	[HttpPost("me/avatar")]
	[HasPermission(Permissions.UsersSelf)]
	[Consumes("multipart/form-data")]
	[ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> UploadProfilePhoto([FromForm] IFormFile? file, CancellationToken ct)
	{
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
		if (userId is null)
			return Unauthorized();

		if (file is null || file.Length == 0)
			return BadRequest(new { Error = "Файл зображення обов'язковий." });

		await using var fileStream = file.OpenReadStream();
		var command = new UploadProfilePhotoCommand(
			Guid.Parse(userId),
			fileStream,
			file.FileName,
			file.ContentType,
			file.Length);

		var result = await _sender.Send(command, ct);
		return result.IsSuccess
			? Ok(result.Payload)
			: BadRequest(new { Error = result.Message });
	}
}
