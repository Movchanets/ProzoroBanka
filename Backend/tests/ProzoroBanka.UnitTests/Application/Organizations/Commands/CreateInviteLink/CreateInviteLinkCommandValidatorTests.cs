using ProzoroBanka.Application.Organizations.Commands.CreateInviteLink;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.CreateInviteLink;

public class CreateInviteLinkCommandValidatorTests
{
	private readonly CreateInviteLinkCommandValidator _validator = new();

	[Theory]
	[InlineData(0)]
	[InlineData(169)]
	public void Validate_ReturnsInvalid_WhenExpiresInHoursOutOfRange(int expiresInHours)
	{
		var command = new CreateInviteLinkCommand(
			Guid.NewGuid(), Guid.NewGuid(), OrganizationRole.Reporter, expiresInHours);

		var result = _validator.Validate(command);

		Assert.False(result.IsValid);
	}

	[Fact]
	public void Validate_ReturnsValid_WhenInputIsCorrect()
	{
		var command = new CreateInviteLinkCommand(
			Guid.NewGuid(), Guid.NewGuid(), OrganizationRole.Admin, 24);

		var result = _validator.Validate(command);

		Assert.True(result.IsValid);
	}
}
