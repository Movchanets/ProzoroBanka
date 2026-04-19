using Moq;
using ProzoroBanka.Application.Campaigns.Queries.GetCampaignDetails;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Campaigns.Queries.GetCampaignDetails;

[Collection("PostgreSQL")]
public class GetCampaignDetailsHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public GetCampaignDetailsHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	public async Task Handle_IncludesDocumentedExpensesInDocumentedAmount()
	{
		await using var db = _fixture.CreateContext();

		var ownerId = Guid.NewGuid();
		var organizationId = Guid.NewGuid();
		var campaignId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = ownerId,
			Email = $"{ownerId:N}@test.com",
			FirstName = "Owner",
			LastName = "User"
		});

		db.Organizations.Add(new Organization
		{
			Id = organizationId,
			Name = "Campaign Org",
			Slug = $"campaign-org-{Guid.NewGuid():N}",
			OwnerUserId = ownerId,
		});

		db.Campaigns.Add(new Campaign
		{
			Id = campaignId,
			OrganizationId = organizationId,
			CreatedByUserId = ownerId,
			Title = "Campaign",
			GoalAmount = 100000,
			CurrentAmount = 61613,
			Status = CampaignStatus.Active,
		});

		db.CampaignPurchases.Add(new CampaignPurchase
		{
			Id = Guid.NewGuid(),
			OrganizationId = organizationId,
			CampaignId = campaignId,
			CreatedByUserId = ownerId,
			Title = "Purchase",
			TotalAmount = 1000,
			Status = PurchaseStatus.PaymentSent,
			Documents =
			[
				new InvoiceDocument
				{
					Id = Guid.NewGuid(),
					UploadedByUserId = ownerId,
					Type = DocumentType.Invoice,
					StorageKey = "invoice.pdf",
					OriginalFileName = "invoice.pdf",
				}
			]
		});

		db.Receipts.AddRange(
			new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = ownerId,
				OrganizationId = organizationId,
				CampaignId = campaignId,
				StorageKey = "active-verified.jpg",
				OriginalFileName = "active-verified.jpg",
				Status = ReceiptStatus.StateVerified,
				PublicationStatus = ReceiptPublicationStatus.Active,
				TotalAmount = 606.13m,
				CreatedAt = DateTime.UtcNow,
			},
			new Receipt
			{
				Id = Guid.NewGuid(),
				UserId = ownerId,
				OrganizationId = organizationId,
				CampaignId = campaignId,
				StorageKey = "draft-verified.jpg",
				OriginalFileName = "draft-verified.jpg",
				Status = ReceiptStatus.StateVerified,
				PublicationStatus = ReceiptPublicationStatus.Draft,
				TotalAmount = 193.87m,
				CreatedAt = DateTime.UtcNow,
			});

		await db.SaveChangesAsync();

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.IsMember(organizationId, ownerId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(storageKey => $"https://local/{storageKey}");

		var handler = new GetCampaignDetailsHandler(db, orgAuth.Object, fileStorage.Object);
		var result = await handler.Handle(new GetCampaignDetailsQuery(ownerId, campaignId), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.Equal(61613, result.Payload!.DocumentedAmount);
		Assert.Equal(100, result.Payload.DocumentationPercent, 3);
	}
}