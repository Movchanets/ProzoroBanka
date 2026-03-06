using Moq;
using ProzoroBanka.Application.Auth.DTOs;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Users.Commands.AuthenticateUser;

namespace ProzoroBanka.UnitTests.Application.Users.Commands.AuthenticateUser;

public class AuthenticateUserHandlerTests
{
	[Fact]
	public async Task Handle_ReturnsMappedAuthResponse_WhenLoginSucceeds()
	{
		var userService = new Mock<IUserService>();
		userService
			.Setup(service => service.LoginAsync("admin@example.com", "Password123!", It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<AuthResult>.Success(new AuthResult(
				"access-token",
				"refresh-token",
				new DateTime(2026, 3, 6, 12, 0, 0, DateTimeKind.Utc),
				Guid.Parse("11111111-1111-1111-1111-111111111111"),
				"admin@example.com",
				"System",
				"Administrator",
				"https://cdn.local/avatar.jpg")));

		var handler = new AuthenticateUserHandler(userService.Object);

		var result = await handler.Handle(
			new AuthenticateUserCommand("admin@example.com", "Password123!"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal("access-token", result.Payload!.AccessToken);
		Assert.Equal("refresh-token", result.Payload.RefreshToken);
		Assert.Equal("admin@example.com", result.Payload.User.Email);
		Assert.Equal("System", result.Payload.User.FirstName);
		Assert.Equal("Administrator", result.Payload.User.LastName);
		Assert.Equal("https://cdn.local/avatar.jpg", result.Payload.User.ProfilePhotoUrl);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenLoginFails()
	{
		var userService = new Mock<IUserService>();
		userService
			.Setup(service => service.LoginAsync("admin@example.com", "wrong-password", It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<AuthResult>.Failure("Невірний email або пароль."));

		var handler = new AuthenticateUserHandler(userService.Object);

		var result = await handler.Handle(
			new AuthenticateUserCommand("admin@example.com", "wrong-password"),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Equal("Невірний email або пароль.", result.Message);
		Assert.Null(result.Payload);
	}
}