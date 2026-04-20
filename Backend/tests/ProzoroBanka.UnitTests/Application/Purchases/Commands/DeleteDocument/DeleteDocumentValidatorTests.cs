using ProzoroBanka.Application.Purchases.Commands.DeleteDocument;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.DeleteDocument;

public class DeleteDocumentValidatorTests
{
	private readonly DeleteDocumentValidator _validator = new();

	[Fact]
	public void Validate_ReturnsInvalid_WhenDocumentIdIsEmpty()
	{
		var command = new DeleteDocumentCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.Empty);

		var result = _validator.Validate(command);

		Assert.False(result.IsValid);
	}

	[Fact]
	public void Validate_ReturnsValid_WhenAllIdsProvided()
	{
		var command = new DeleteDocumentCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid());

		var result = _validator.Validate(command);

		Assert.True(result.IsValid);
	}
}
