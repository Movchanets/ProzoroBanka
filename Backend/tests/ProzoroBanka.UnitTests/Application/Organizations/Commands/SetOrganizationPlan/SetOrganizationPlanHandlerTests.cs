using Microsoft.EntityFrameworkCore;
using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Organizations.Commands.SetOrganizationPlan;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Commands.SetOrganizationPlan;

[Collection("PostgreSQL")]
public class SetOrganizationPlanHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public SetOrganizationPlanHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_SetsOrganizationPlanSuccessfully()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var adminId = Guid.NewGuid();

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Test Org",
			PlanType = OrganizationPlanType.Free
		});
		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => $"test/{key}");

		var handler = new SetOrganizationPlanHandler(db, fileStorage.Object);
		var result = await handler.Handle(
			new SetOrganizationPlanCommand(orgId, OrganizationPlanType.Paid, adminId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(OrganizationPlanType.Paid, result.Payload!.PlanType);

		var dbOrg = await db.Organizations.FindAsync(orgId);
		Assert.Equal(OrganizationPlanType.Paid, dbOrg!.PlanType);
		Assert.Equal(adminId, dbOrg.PlanChangedByUserId);
		Assert.NotNull(dbOrg.PlanChangedAtUtc);
	}

	[Fact]
	public async Task Handle_ReturnsFailure_WhenPlanIsSame()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var adminId = Guid.NewGuid();

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Test Org",
			PlanType = OrganizationPlanType.Free
		});
		await db.SaveChangesAsync();

		var fileStorage = new Mock<IFileStorage>();

		var handler = new SetOrganizationPlanHandler(db, fileStorage.Object);
		var result = await handler.Handle(
			new SetOrganizationPlanCommand(orgId, OrganizationPlanType.Free, adminId),
			CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Contains("вже має цей тарифний план", result.Message!);
	}
}
