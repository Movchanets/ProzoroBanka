using Moq;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Commands.VerifyReceipt;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.UnitTests.Infrastructure;

namespace ProzoroBanka.UnitTests.Application.Receipts.Commands.VerifyReceipt;

[Collection("PostgreSQL")]
public class VerifyReceiptHandlerTests
{
	private readonly PostgreSqlUnitTestFixture _fixture;

	public VerifyReceiptHandlerTests(PostgreSqlUnitTestFixture fixture)
	{
		_fixture = fixture;
	}

	private static async Task<(Guid UserId, Guid ReceiptId, Guid OrgId)> SeedExtractedFiscalReceiptAsync(ApplicationDbContext db)
	{
		var userId = Guid.NewGuid();
		var receiptId = Guid.NewGuid();
		var orgId = Guid.NewGuid();

		db.DomainUsers.Add(new User
		{
			Id = userId,
			Email = $"user-{userId:N}@test.com",
			FirstName = "Verify",
			LastName = "User"
		});

		db.Organizations.Add(new Organization
		{
			Id = orgId,
			Name = "Verify Org",
			Slug = $"verify-org-{orgId:N}",
			OwnerUserId = userId
		});

		db.Receipts.Add(new Receipt
		{
			Id = receiptId,
			UserId = userId,
			OrganizationId = orgId,
			StorageKey = "uploads/receipt.png",
			ReceiptImageStorageKey = "uploads/receipt.png",
			OriginalFileName = "receipt.png",
			Status = ReceiptStatus.OcrExtracted,
			PublicationStatus = ReceiptPublicationStatus.Draft,
			RegistryType = RegistryReceiptType.Fiscal,
			FiscalNumber = "FN-123"
		});

		await db.SaveChangesAsync();
		return (userId, receiptId, orgId);
	}

	[Fact]
	public async Task Handle_WhenStateValidationSucceeds_SetsStateVerified()
	{
		await using var db = _fixture.CreateContext();
		var (userId, receiptId, orgId) = await SeedExtractedFiscalReceiptAsync(db);

		var validator = new Mock<IStateReceiptValidator>();
		validator.Setup(v => v.ValidateFiscalAsync("FN-123", "secret-api-key", It.IsAny<CancellationToken>()))
			.ReturnsAsync(new RegistryValidationResult(true, "STATE-OK-1", null));

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		var org = await db.Organizations.SingleAsync(x => x.Id == orgId);
		var member = new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = userId,
			Role = OrganizationRole.Owner,
			PermissionsFlags = OrganizationPermissions.All,
			JoinedAt = DateTime.UtcNow
		};
		orgAuth.Setup(x => x.EnsureOrganizationAccessAsync(
				orgId,
				userId,
				OrganizationPermissions.ManageReceipts,
				null,
				It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(new OrganizationAccessContext(org, member)));

		var credentials = new Mock<IRegistryCredentialService>();
		credentials.Setup(c => c.HasActiveKeyAsync(orgId, RegistryProvider.TaxService, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<bool>.Success(true));
		credentials.Setup(c => c.DecryptApiKeyAsync(orgId, RegistryProvider.TaxService, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<string>.Success("secret-api-key"));

		var quota = new Mock<IApiKeyDailyQuotaService>();
		quota.Setup(q => q.TryConsumeAsync(It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new QuotaDecision(true, null));

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new VerifyReceiptHandler(db, orgAuth.Object, validator.Object, credentials.Object, quota.Object, fileStorage.Object);
		var result = await handler.Handle(new VerifyReceiptCommand(userId, receiptId, orgId), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal(ReceiptStatus.StateVerified, result.Payload.Status);

		var reloaded = await db.Receipts.FindAsync(receiptId);
		Assert.NotNull(reloaded);
		Assert.Equal(ReceiptStatus.StateVerified, reloaded!.Status);
		Assert.Equal("STATE-OK-1", reloaded.StateVerificationReference);
		Assert.NotNull(reloaded.StateVerifiedAtUtc);
	}

	[Fact]
	public async Task Handle_WhenStateValidationFails_SetsFailedVerification()
	{
		await using var db = _fixture.CreateContext();
		var (userId, receiptId, orgId) = await SeedExtractedFiscalReceiptAsync(db);

		var validator = new Mock<IStateReceiptValidator>();
		validator.Setup(v => v.ValidateFiscalAsync("FN-123", "secret-api-key", It.IsAny<CancellationToken>()))
			.ReturnsAsync(new RegistryValidationResult(false, "STATE-FAIL-1", "Не знайдено в реєстрі"));

		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		var org = await db.Organizations.SingleAsync(x => x.Id == orgId);
		var member = new OrganizationMember
		{
			OrganizationId = orgId,
			UserId = userId,
			Role = OrganizationRole.Owner,
			PermissionsFlags = OrganizationPermissions.All,
			JoinedAt = DateTime.UtcNow
		};
		orgAuth.Setup(x => x.EnsureOrganizationAccessAsync(
				orgId,
				userId,
				OrganizationPermissions.ManageReceipts,
				null,
				It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Success(new OrganizationAccessContext(org, member)));

		var credentials = new Mock<IRegistryCredentialService>();
		credentials.Setup(c => c.HasActiveKeyAsync(orgId, RegistryProvider.TaxService, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<bool>.Success(true));
		credentials.Setup(c => c.DecryptApiKeyAsync(orgId, RegistryProvider.TaxService, It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<string>.Success("secret-api-key"));

		var quota = new Mock<IApiKeyDailyQuotaService>();
		quota.Setup(q => q.TryConsumeAsync(It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(new QuotaDecision(true, null));

		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new VerifyReceiptHandler(db, orgAuth.Object, validator.Object, credentials.Object, quota.Object, fileStorage.Object);
		var result = await handler.Handle(new VerifyReceiptCommand(userId, receiptId, orgId), CancellationToken.None);

		Assert.True(result.IsSuccess);
		Assert.NotNull(result.Payload);
		Assert.Equal(ReceiptStatus.FailedVerification, result.Payload.Status);

		var reloaded = await db.Receipts.FindAsync(receiptId);
		Assert.NotNull(reloaded);
		Assert.Equal(ReceiptStatus.FailedVerification, reloaded!.Status);
		Assert.Equal("Не знайдено в реєстрі", reloaded.VerificationFailureReason);
	}

	[Fact]
	public async Task Handle_WhenOrganizationIsBlocked_ReturnsFailure()
	{
		await using var db = _fixture.CreateContext();
		var (userId, receiptId, orgId) = await SeedExtractedFiscalReceiptAsync(db);

		var validator = new Mock<IStateReceiptValidator>();
		var orgAuth = new Mock<IOrganizationAuthorizationService>();
		orgAuth.Setup(x => x.EnsureOrganizationAccessAsync(
				orgId,
				userId,
				OrganizationPermissions.ManageReceipts,
				null,
				It.IsAny<CancellationToken>()))
			.ReturnsAsync(ServiceResponse<OrganizationAccessContext>.Failure("Організацію заблоковано. Зміни заборонені."));

		var credentials = new Mock<IRegistryCredentialService>();
		var quota = new Mock<IApiKeyDailyQuotaService>();
		var fileStorage = new Mock<IFileStorage>();
		fileStorage.Setup(x => x.GetPublicUrl(It.IsAny<string>())).Returns<string>(key => key);

		var handler = new VerifyReceiptHandler(db, orgAuth.Object, validator.Object, credentials.Object, quota.Object, fileStorage.Object);
		var result = await handler.Handle(new VerifyReceiptCommand(userId, receiptId, orgId), CancellationToken.None);

		Assert.False(result.IsSuccess);
		Assert.Equal("Організацію заблоковано. Зміни заборонені.", result.Message);
		validator.Verify(v => v.ValidateFiscalAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}
