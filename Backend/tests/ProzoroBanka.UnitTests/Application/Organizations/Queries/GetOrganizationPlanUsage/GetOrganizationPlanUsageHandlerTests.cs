using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.Queries.GetOrganizationPlanUsage;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Organizations.Queries.GetOrganizationPlanUsage;

[Collection("PostgreSQL")]
public class GetOrganizationPlanUsageHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public GetOrganizationPlanUsageHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_ReturnsFreePlanLimitsAndUsage()
	{
		await using var db = _fixture.CreateContext();
		var orgId = Guid.NewGuid();
		var userId = Guid.NewGuid();

		db.DomainUsers.Add(new User { Id = userId, Email = "usage@test.com", FirstName = "U", LastName = "S" });

		var org = new Organization
		{
			Id = orgId,
			Name = "Free Org",
			Slug = "free-org",
			OwnerUserId = userId,
			PlanType = OrganizationPlanType.Free,
			Members = new List<OrganizationMember> { new OrganizationMember { UserId = userId, Role = OrganizationRole.Owner } },
			Campaigns = new List<Campaign> { new Campaign { GoalAmount = 100, Title = "Test Campaign", CreatedByUserId = userId } }
		};

		db.Organizations.Add(org);
		await db.SaveChangesAsync();

		var options = Options.Create(new OrganizationPlansOptions
		{
			Free = new OrganizationPlanLimits { MaxCampaigns = 3, MaxMembers = 10, MaxOcrExtractionsPerMonth = 100 },
			Paid = new OrganizationPlanLimits { MaxCampaigns = 100, MaxMembers = 200, MaxOcrExtractionsPerMonth = 5000 }
		});

		var handler = new GetOrganizationPlanUsageHandler(db, options);
		var result = await handler.Handle(
			new GetOrganizationPlanUsageQuery(orgId),
			CancellationToken.None);

		Assert.True(result.IsSuccess);
		var usage = result.Payload!;
		Assert.Equal(OrganizationPlanType.Free, usage.PlanType);
		Assert.Equal(3, usage.MaxCampaigns);
		Assert.Equal(10, usage.MaxMembers);
		Assert.Equal(100, usage.MaxOcrExtractionsPerMonth);
		Assert.Equal(1, usage.CurrentCampaigns);
		Assert.Equal(1, usage.CurrentMembers);
	}
}
