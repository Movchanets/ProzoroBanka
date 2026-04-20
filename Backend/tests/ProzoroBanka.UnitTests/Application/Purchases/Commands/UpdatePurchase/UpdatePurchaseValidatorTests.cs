using ProzoroBanka.Application.Purchases.Commands.UpdatePurchase;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.UpdatePurchase;

public class UpdatePurchaseValidatorTests
{
	private readonly UpdatePurchaseValidator _validator = new();

	[Fact]
	public void Validate_ReturnsInvalid_WhenNoUpdateFieldsProvided()
	{
		var command = new UpdatePurchaseCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			null,
			null,
			null);

		var result = _validator.Validate(command);

		Assert.False(result.IsValid);
	}

	[Fact]
	public void Validate_ReturnsInvalid_WhenTotalAmountIsNotPositive()
	{
		var command = new UpdatePurchaseCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			"Updated",
			0,
			PurchaseStatus.Completed);

		var result = _validator.Validate(command);

		Assert.False(result.IsValid);
	}

	[Fact]
	public void Validate_ReturnsValid_WhenAtLeastOneFieldProvided()
	{
		var command = new UpdatePurchaseCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			"Updated",
			null,
			null);

		var result = _validator.Validate(command);

		Assert.True(result.IsValid);
	}
}
