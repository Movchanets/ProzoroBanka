using Moq;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.CreateDraftPurchase;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.CreateDraftPurchase;

[Collection("PostgreSQL")]
public class CreateDraftPurchaseHandlerTests
{
    private readonly PostgreSqlUnitTestFixture _fixture;

    public CreateDraftPurchaseHandlerTests(PostgreSqlUnitTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_WithValidRequest_CreatesDraftPurchaseWithoutCampaign()
    {
        await using var db = _fixture.CreateContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();

        db.DomainUsers.Add(new User
        {
            Id = userId,
            Email = $"user-{userId:N}@test.com",
            FirstName = "Draft",
            LastName = "Owner"
        });

        db.Organizations.Add(new Organization
        {
            Id = orgId,
            Name = "Draft Org",
            Slug = $"draft-org-{orgId:N}",
            OwnerUserId = userId
        });

        await db.SaveChangesAsync();

        var orgAuthMock = new Mock<IOrganizationAuthorizationService>();
        orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

        var handler = new CreateDraftPurchaseHandler(db, orgAuthMock.Object);

        var result = await handler.Handle(new CreateDraftPurchaseCommand(userId, orgId, "Draft purchase", "Draft description"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var saved = await db.CampaignPurchases.FindAsync(result.Payload);
        Assert.NotNull(saved);
        Assert.Null(saved!.CampaignId);
        Assert.Equal("Draft purchase", saved.Title);
        Assert.Equal("Draft description", saved.Description);
        Assert.Equal(PurchaseStatus.PaymentSent, saved.Status);
    }
}
