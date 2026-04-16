using Microsoft.EntityFrameworkCore;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.Commands.UpdateOrganization;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Domain.Interfaces;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.UpdateOrganization;

[Collection("PostgreSQL")]
public class UpdateOrganizationHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public UpdateOrganizationHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_UpdatesPhoneNumber()
	{
		await using var db = _fixture.CreateContext();
		var ownerId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = ownerId,
			Email = $"owner-{ownerId:N}@test.com",
			FirstName = "Owner",
			LastName = "User"
		});
		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Test Org",
			Slug = $"test-org-{orgId:N}",
			OwnerUserId = ownerId
		});
		await db.SaveChangesAsync();

		var organization = await db.Organizations.SingleAsync(x => x.Id == orgId);
		var membership = new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = ownerId,
			Role = OrganizationRole.Owner,
			PermissionsFlags = OrganizationPermissions.All,
			JoinedAt = DateTime.UtcNow
		};

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.EnsureOrganizationAccessAsync(
				orgId,
				ownerId,
				OrganizationPermissions.ManageOrganization,
				null,
				It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(new OrganizationAccessContext(organization, membership)));

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => $"https://storage.test/{key}");

		var orgRepo = new Mock<IOrganizationRepository>();
		orgRepo.Setup(x => x.SlugExistsAsync(It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);

		var handler = new UpdateOrganizationHandler(db, orgRepo.Object, orgAuth.Object, fileStorage.Object);
		var result = await handler.Handle(
			new UpdateOrganizationCommand(ownerId, orgId, null, null, null, null, "+380 67 123 45 67"),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal("+380 67 123 45 67", result.Payload.Phone);

		var persisted = await db.Organizations.SingleAsync(x => x.Id == orgId);
		Assert.Equal("+380 67 123 45 67", persisted.Phone);
	}

	[Fact]
	public void Validator_RejectsInvalidPhoneNumber()
	{
		var validator = new UpdateOrganizationCommandValidator();
		var result = validator.Validate(new UpdateOrganizationCommand(
			Guid.NewGuid(),
			Guid.NewGuid(),
			null,
			null,
			null,
			null,
			"abc-123"));

		Assert.False(result.IsValid);
		Assert.Contains(result.Errors, error => error.PropertyName == nameof(UpdateOrganizationCommand.Phone));
	}
}