using ProzoroBanka.Application.Purchases.Commands.UpdateDocumentMetadata;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.UpdateDocumentMetadata;

public class UpdateDocumentMetadataValidatorTests
{
	private readonly UpdateDocumentMetadataValidator _validator = new();

	[Fact]
	public void Validate_ReturnsInvalid_WhenNoFieldsProvided()
	{
		var command = new UpdateDocumentMetadataCommand(
			Guid.NewGuid(),
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
	public void Validate_ReturnsInvalid_WhenAmountIsNotPositive()
	{
		var command = new UpdateDocumentMetadataCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			0,
			null,
			null);

		var result = _validator.Validate(command);

		Assert.False(result.IsValid);
	}

	[Fact]
	public void Validate_ReturnsValid_WhenSingleFieldProvided()
	{
		var command = new UpdateDocumentMetadataCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			Guid.NewGuid(),
			null,
			"ТОВ Дрони",
			null);

		var result = _validator.Validate(command);

		Assert.True(result.IsValid);
	}
}
