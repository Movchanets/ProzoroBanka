using Microsoft.EntityFrameworkCore;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Organizations.Commands.CreateOrganization;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.CreateOrganization;

[Collection("PostgreSQL")]
public class CreateOrganizationHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public CreateOrganizationHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_CreatesOrganization_WithOwnerMember()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"creator-{userId:N}@test.com",
			FirstName = "Creator",
			LastName = "User"
		});
		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>()))
			.Returns<string>(key => $"https://storage.test/uploads/{key}");

		var handler = new CreateOrganizationHandler(db, fileStorage.Object);
		var result = await handler.Handle(
			new CreateOrganizationCommand(userId, "My Test Org", "A description", null, null),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal("My Test Org", result.Payload.Name);
		Assert.False(string.IsNullOrWhiteSpace(result.Payload.Slug));

		// SaveChangesAsync auto-creates an Owner member — verify it exists
		var orgId = result.Payload.Id;
		Assert.True(await db.OrganizationMembers.AnyAsync(
			m => m.OrganizationId == orgId && m.UserId == userId));
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenUserNotFound()
	{
		await using var db = _fixture.CreateContext();
		var unknownUserId = Guid.NewGuid();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>()))
			.Returns<string>(key => $"https://storage.test/uploads/{key}");

		var handler = new CreateOrganizationHandler(db, fileStorage.Object);
		var result = await handler.Handle(
			new CreateOrganizationCommand(unknownUserId, "Ghost Org", null, null, null),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("не знайдено", result.Message);
	}
}
