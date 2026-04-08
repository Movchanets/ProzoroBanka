using ProzoroBanka.Application.Public.Queries.GetPublicCampaignReceipts;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Public.Queries.GetPublicCampaignReceipts;

[Collection("PostgreSQL")]
public class GetPublicCampaignReceiptsHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public GetPublicCampaignReceiptsHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_ReturnsOnlyVerifiedReceipts_ForOrganizationMembers()
	{
		await using var db = _fixture.CreateContext();

		var ownerId = Guid.NewGuid();
		var memberId = Guid.NewGuid();
		var outsiderId = Guid.NewGuid();
		var orgId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();

		db.DomainUsers.AddRange(
			new User { Id = ownerId, Email = $"{ownerId:N}@test.com", FirstName = "Owner", LastName = "User" },
			new User { Id = memberId, Email = $"{memberId:N}@test.com", FirstName = "Member", LastName = "User" },
			new User { Id = outsiderId, Email = $"{outsiderId:N}@test.com", FirstName = "Out", LastName = "Sider" });

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Org",
			Slug = $"org-{Guid.NewGuid():N}",
			OwnerUserId = ownerId
		});

		db.OrganizationMembers.Add(new OrganizationMember
		{
			Id = Guid.NewGuid(),
			OrganizationId = orgId,
			UserId = memberId,
			Role = OrganizationRole.Reporter,
			PermissionsFlags = OrganizationPermissions.ManageReceipts,
			JoinedAt = DateTime.UtcNow
		});

		db.Campaigns.Add(new Campaign
		{
			Id = campaignId,
			OrganizationId = orgId,
			CreatedByUserId = ownerId,
			Title = "Campaign",
			GoalAmount = 1000,
			CurrentAmount = 100,
			Status = CampaignStatus.Active
		});

		db.Receipts.AddRange(
			new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = memberId,
				CampaignId = campaignId,
				StorageKey = "member-verified.jpg",
				OriginalFileName = "member-verified.jpg",
				Status = ReceiptStatus.Verified,
				PublicationStatus = ReceiptPublicationStatus.Active,
				TotalAmount = 120m,
				CreatedAt = DateTime.UtcNow
			},
			new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = memberId,
				CampaignId = campaignId,
				StorageKey = "member-draft.jpg",
				OriginalFileName = "member-draft.jpg",
				Status = ReceiptStatus.Draft,
				PublicationStatus = ReceiptPublicationStatus.Active,
				TotalAmount = 75m,
				CreatedAt = DateTime.UtcNow
			},
			new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = outsiderId,
				CampaignId = campaignId,
				StorageKey = "outsider-verified.jpg",
				OriginalFileName = "outsider-verified.jpg",
				Status = ReceiptStatus.Verified,
				PublicationStatus = ReceiptPublicationStatus.Draft,
				TotalAmount = 250m,
				CreatedAt = DateTime.UtcNow
			});

		await db.SaveChangesAsync();

		var handler = new GetPublicCampaignReceiptsHandler(db);
		var result = await handler.Handle(new GetPublicCampaignReceiptsQuery(campaignId, 1, 20), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Single(result.Payload!.Items);
		Assert.Equal(120m, result.Payload.Items[0].TotalAmount);
	}
}
