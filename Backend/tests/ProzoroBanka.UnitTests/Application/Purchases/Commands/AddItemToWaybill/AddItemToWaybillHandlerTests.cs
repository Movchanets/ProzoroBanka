using Moq;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Commands.AddItemToWaybill;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Purchases.Commands.AddItemToWaybill;

[Collection("PostgreSQL")]
public class AddItemToWaybillHandlerTests
{
    private readonly PostgreSqlUnitTestFixture _fixture;

    public AddItemToWaybillHandlerTests(PostgreSqlUnitTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_WithWaybill_AddsCampaignItem()
    {
        await using var db = _fixture.CreateContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var purchaseId = Guid.NewGuid();
        var documentId = Guid.NewGuid();

        db.DomainUsers.Add(new User { Id = userId, Email = $"u-{userId:N}@test.com", FirstName = "A", LastName = "B" });
        db.Organizations.Add(new Organization { Id = orgId, Name = "Org", Slug = $"org-{orgId:N}", OwnerUserId = userId });
        db.Campaigns.Add(new Campaign { Id = campaignId, OrganizationId = orgId, CreatedByUserId = userId, Title = "Campaign", Description = "Desc", Status = CampaignStatus.Active });
        db.CampaignPurchases.Add(new CampaignPurchase
        {
            Id = purchaseId,
            OrganizationId = orgId,
            CampaignId = campaignId,
            CreatedByUserId = userId,
            Title = "Purchase",
            TotalAmount = 0
        });
        db.CampaignDocuments.Add(new WaybillDocument
        {
            Id = documentId,
            PurchaseId = purchaseId,
            UploadedByUserId = userId,
            Type = DocumentType.Waybill,
            StorageKey = "waybill.pdf",
            OriginalFileName = "waybill.pdf",
            OcrProcessingStatus = OcrProcessingStatus.NotProcessed,
            IsDataVerifiedByUser = false
        });

        await db.SaveChangesAsync();

        var orgAuthMock = new Mock<IOrganizationAuthorizationService>();
        orgAuthMock.Setup(x => x.EnsureOrganizationAccessAsync(orgId, userId, OrganizationPermissions.ManagePurchases, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(null!));

        var handler = new AddItemToWaybillHandler(db, orgAuthMock.Object);

        var result = await handler.Handle(new AddItemToWaybillCommand(userId, documentId, "Drone", 2, 150000), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var item = await db.CampaignItems.FindAsync(result.Payload);
        Assert.NotNull(item);
        Assert.Equal("Drone", item!.Name);
        Assert.Equal(2, item.Quantity);
        Assert.Equal(150000, item.UnitPrice);
        Assert.Equal(300000, item.TotalPrice);

        var reloadedWaybill = await db.CampaignDocuments
            .OfType<WaybillDocument>()
            .Include(x => x.Items)
            .FirstAsync(x => x.Id == documentId);

        Assert.Single(reloadedWaybill.Items, x => !x.IsDeleted);

        var reloadedPurchase = await db.CampaignPurchases.FirstAsync(x => x.Id == purchaseId);
        Assert.Equal(300000, reloadedPurchase.TotalAmount);
    }
}
