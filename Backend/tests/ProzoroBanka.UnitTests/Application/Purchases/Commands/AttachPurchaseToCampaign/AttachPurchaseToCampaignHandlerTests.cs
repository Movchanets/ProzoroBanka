using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.AttachPurchaseToCampaign;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.AttachPurchaseToCampaign;

[Collection("PostgreSQL")]
public class AttachPurchaseToCampaignHandlerTests
{
    private readonly PostgreSqlUnitTestFixture _fixture;

    public AttachPurchaseToCampaignHandlerTests(PostgreSqlUnitTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_WithDraftPurchaseAndActiveCampaign_AttachesPurchase()
    {
        await using var db = _fixture.CreateContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();

        db.DomainUsers.Add(new User { Id = userId, Email = $"u-{userId:N}@test.com", FirstName = "A", LastName = "B" });
        db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = $"org-{orgId:N}", OwnerUserId = userId });
        db.Campaigns.Add(new Campaign
        {
            Id = campaignId,
            OrganizationId = orgId,
            CreatedByUserId = userId,
            Title = "Campaign",
            Description = "Desc",
            Status = CampaignStatus.Active
        });
        db.CampaignPurchases.Add(new CampaignPurchase
        {
            Id = purchaseId,
            OrganizationId = orgId,
            CampaignId = null,
            CreatedByUserId = userId,
            Title = "Draft",
            TotalAmount = 0
        });

        await db.SaveChangesAsync();

        var orgAuthMock = new Mock<IOrganizationAuthorizationService>();
        orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

        var handler = new AttachPurchaseToCampaignHandler(db, orgAuthMock.Object);

        var result = await handler.Handle(new AttachPurchaseToCampaignCommand(userId, purchaseId, campaignId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var saved = await db.CampaignPurchases.FindAsync(purchaseId);
        Assert.NotNull(saved);
        Assert.Equal(campaignId, saved!.CampaignId);
    }
}
