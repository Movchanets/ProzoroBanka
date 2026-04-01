using Microsoft.EntityFrameworkCore;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Organizations.Commands.CreateOrganization;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Interfaces;
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

		var orgRepo = new Mock<IOrganizationRepository>();
		orgRepo.Setup(r => r.Add(It.IsAny<Organization>()))
			.Callback<Organization>(org => db.Organizations.Add(org));
		orgRepo.Setup(r => r.SlugExistsAsync(It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		var unitOfWork = new Mock<IUnitOfWork>();
		unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
			.Returns((CancellationToken ct) => db.SaveChangesAsync(ct));
		var currentUser = new Mock<ICurrentUserService>();
		currentUser.SetupGet(x => x.IsAdmin).Returns(false);
		var systemSettings = new Mock<ISystemSettingsService>();
		systemSettings.Setup(x => x.GetMaxOwnedOrganizationsForNonAdminAsync(It.IsAny<CancellationToken>())).ReturnsAsync(10);

		var handler = new CreateOrganizationHandler(db, orgRepo.Object, fileStorage.Object, unitOfWork.Object, currentUser.Object, systemSettings.Object);
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

		var orgRepo = new Mock<IOrganizationRepository>();
		var unitOfWork = new Mock<IUnitOfWork>();
		var currentUser = new Mock<ICurrentUserService>();
		currentUser.SetupGet(x => x.IsAdmin).Returns(false);
		var systemSettings = new Mock<ISystemSettingsService>();
		systemSettings.Setup(x => x.GetMaxOwnedOrganizationsForNonAdminAsync(It.IsAny<CancellationToken>())).ReturnsAsync(10);

		var handler = new CreateOrganizationHandler(db, orgRepo.Object, fileStorage.Object, unitOfWork.Object, currentUser.Object, systemSettings.Object);
		var result = await handler.Handle(
			new CreateOrganizationCommand(unknownUserId, "Ghost Org", null, null, null),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("не знайдено", result.Message);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenNonAdminOwnsTenOrganizations()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"limit-owner-{userId:N}@test.com",
			FirstName = "Limit",
			LastName = "Owner"
		});

		for (var i = 0; i < 10; i++)
		{
			db.Organizations.Add(new Organization
			{
				Name = $"Org {i}",
				Slug = $"limit-org-{i}-{userId:N}",
				OwnerUserId = userId
			});
		}

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		var orgRepo = new Mock<IOrganizationRepository>();
		orgRepo.Setup(r => r.SlugExistsAsync(It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);
		var unitOfWork = new Mock<IUnitOfWork>();
		var currentUser = new Mock<ICurrentUserService>();
		currentUser.SetupGet(x => x.IsAdmin).Returns(false);
		var systemSettings = new Mock<ISystemSettingsService>();
		systemSettings.Setup(x => x.GetMaxOwnedOrganizationsForNonAdminAsync(It.IsAny<CancellationToken>())).ReturnsAsync(10);

		var handler = new CreateOrganizationHandler(db, orgRepo.Object, fileStorage.Object, unitOfWork.Object, currentUser.Object, systemSettings.Object);
		var result = await handler.Handle(
			new CreateOrganizationCommand(userId, "Overflow Org", null, null, null),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("максимум 10", result.Message);
		Assert.Equal(10, await db.Organizations.CountAsync(o => o.OwnerUserId == userId));
	}

	[Fact]
	public async Task Handle_AllowsCreation_WhenAdminOwnsTenOrganizations()
	{
		await using var db = _fixture.CreateContext();
		var userId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"admin-owner-{userId:N}@test.com",
			FirstName = "Admin",
			LastName = "Owner"
		});

		for (var i = 0; i < 10; i++)
		{
			db.Organizations.Add(new Organization
			{
				Name = $"Admin Org {i}",
				Slug = $"admin-limit-org-{i}-{userId:N}",
				OwnerUserId = userId
			});
		}

		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		var orgRepo = new Mock<IOrganizationRepository>();
		orgRepo.Setup(r => r.Add(It.IsAny<Organization>()))
			.Callback<Organization>(org => db.Organizations.Add(org));
		orgRepo.Setup(r => r.SlugExistsAsync(It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);
		var unitOfWork = new Mock<IUnitOfWork>();
		unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
			.Returns((CancellationToken ct) => db.SaveChangesAsync(ct));
		var currentUser = new Mock<ICurrentUserService>();
		currentUser.SetupGet(x => x.IsAdmin).Returns(true);
		var systemSettings = new Mock<ISystemSettingsService>();
		systemSettings.Setup(x => x.GetMaxOwnedOrganizationsForNonAdminAsync(It.IsAny<CancellationToken>())).ReturnsAsync(10);

		var handler = new CreateOrganizationHandler(db, orgRepo.Object, fileStorage.Object, unitOfWork.Object, currentUser.Object, systemSettings.Object);
		var result = await handler.Handle(
			new CreateOrganizationCommand(userId, "Admin Overflow Org", null, null, null),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(11, await db.Organizations.CountAsync(o => o.OwnerUserId == userId));
	}
}
