using ProzoroBanka.Application.Organizations.Commands.InviteByEmail;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.InviteByEmail;

public class InviteByEmailCommandValidatorTests
{
	private readonly InviteByEmailCommandValidator _validator = new();

	[Theory]
	[InlineData("")]
	[InlineData("not-an-email")]
	public void Validate_ReturnsInvalid_WhenEmailIsInvalid(string email)
	{
		var command = new InviteByEmailCommand(
			Guid.NewGuid(), Guid.NewGuid(), email, OrganizationRole.Reporter);

		var result = _validator.Validate(command);

		Assert.False(result.IsValid);
	}

	[Fact]
	public void Validate_ReturnsValid_WhenEmailIsCorrect()
	{
		var command = new InviteByEmailCommand(
			Guid.NewGuid(), Guid.NewGuid(), "valid@example.com", OrganizationRole.Admin);

		var result = _validator.Validate(command);

		Assert.True(result.IsValid);
	}
}
