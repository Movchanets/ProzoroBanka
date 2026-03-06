using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Users.Commands.RegisterUser;

namespace ProzoroBanka.UnitTests.Application.Users.Commands.RegisterUser;

public class RegisterUserHandlerTests
{
	[Fact]
	public async Task Handle_ReturnsMappedAuthResponse_WhenRegistrationSucceeds()
	{
		var userService = new Mock<IUserService>();
		userService
			.Setup(service => service.RegisterAsync(
				"new@example.com",
				"Password123!",
				"New",
				"Volunteer",
				It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<AuthResult>.Success(new AuthResult(
				"access-token",
				"refresh-token",
				new DateTime(2026, 3, 6, 12, 0, 0, DateTimeKind.Utc),
				Guid.Parse("22222222-2222-2222-2222-222222222222"),
				"new@example.com",
				"New",
				"Volunteer",
				null)));

		var handler = new RegisterUserHandler(userService.Object);

		var result = await handler.Handle(
			new RegisterUserCommand("new@example.com", "Password123!", "Password123!", "New", "Volunteer"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal("new@example.com", result.Payload!.User.Email);
		Assert.Equal("New", result.Payload.User.FirstName);
	}
}