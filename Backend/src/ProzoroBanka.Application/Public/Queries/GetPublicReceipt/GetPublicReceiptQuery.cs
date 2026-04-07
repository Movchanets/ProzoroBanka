using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Helpers;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Public.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Public.Queries.GetPublicReceipt;

public record GetPublicReceiptQuery(Guid ReceiptId) : IRequest<ServiceResponse<PublicReceiptDetailDto>>;

public class GetPublicReceiptHandler : IRequestHandler<GetPublicReceiptQuery, ServiceResponse<PublicReceiptDetailDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public GetPublicReceiptHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<PublicReceiptDetailDto>> Handle(
		GetPublicReceiptQuery request,
		CancellationToken cancellationToken)
	{
		var receipt = await _db.Receipts
			.AsNoTracking()
			.Where(r => r.Id == request.ReceiptId
				&& r.Status == ReceiptStatus.StateVerified
				&& r.PublicationStatus == ReceiptPublicationStatus.Active)
			.Select(r => new
			{
				r.Id,
				r.MerchantName,
				r.TotalAmount,
				r.TransactionDate,
				r.PurchaseDateUtc,
				r.Status,
				r.StorageKey,
				r.OcrStructuredPayloadJson,
				r.FiscalNumber,
				r.ReceiptCode,
				r.StateVerificationReference,
				AddedByName = r.User.FirstName + " " + r.User.LastName,
				r.CampaignId,
				CampaignTitle = r.Campaign != null ? r.Campaign.Title : null,
				OrganizationName = r.Campaign != null ? r.Campaign.Organization.Name : null,
				OrganizationSlug = r.Campaign != null ? r.Campaign.Organization.Slug : null
			})
			.FirstOrDefaultAsync(cancellationToken);

		if (receipt is null)
			return ServiceResponse<PublicReceiptDetailDto>.Failure("Чек не знайдено");

		var verificationUrl = ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(new Domain.Entities.Receipt
		{
			PurchaseDateUtc = receipt.PurchaseDateUtc,
			TransactionDate = receipt.TransactionDate,
			FiscalNumber = receipt.FiscalNumber,
			ReceiptCode = receipt.ReceiptCode,
			TotalAmount = receipt.TotalAmount,
			StateVerificationReference = receipt.StateVerificationReference
		}, out var generatedVerificationUrl, out _)
			? generatedVerificationUrl
			: receipt.StateVerificationReference;

		var isConfirmed = receipt.Status == ReceiptStatus.StateVerified && !string.IsNullOrWhiteSpace(verificationUrl);

		return ServiceResponse<PublicReceiptDetailDto>.Success(new PublicReceiptDetailDto(
			receipt.Id,
			receipt.MerchantName,
			receipt.TotalAmount,
			receipt.TransactionDate,
			receipt.Status.ToString(),
			StorageUrlResolver.Resolve(_fileStorage, receipt.StorageKey) ?? string.Empty,
			receipt.OcrStructuredPayloadJson,
			receipt.AddedByName,
			receipt.CampaignId,
			receipt.CampaignTitle,
			receipt.OrganizationName,
			receipt.OrganizationSlug,
			verificationUrl,
			isConfirmed));
	}
}
