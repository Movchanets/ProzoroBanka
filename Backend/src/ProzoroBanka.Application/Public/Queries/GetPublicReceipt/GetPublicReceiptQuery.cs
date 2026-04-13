using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Extensions;
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
			.Include(r => r.User)
			.Include(r => r.Campaign)
				.ThenInclude(c => c!.Organization)
			.Include(r => r.Items)
			.Include(r => r.ItemPhotos)
			.Where(r => r.Id == request.ReceiptId
				&& r.Status == ReceiptStatus.StateVerified
				&& r.PublicationStatus == ReceiptPublicationStatus.Active)
			.FirstOrDefaultAsync(cancellationToken);

		if (receipt is null)
			return ServiceResponse<PublicReceiptDetailDto>.Failure("Чек не знайдено");

		var verificationUrl = ReceiptVerificationLinkBuilder.TryBuildTaxCabinetLink(receipt, out var generatedVerificationUrl, out _)
			? generatedVerificationUrl
			: receipt.StateVerificationReference;

		var isConfirmed = receipt.Status == ReceiptStatus.StateVerified && !string.IsNullOrWhiteSpace(verificationUrl);

		var addedByName = string.Join(" ", new[] { receipt.User.FirstName, receipt.User.LastName }
			.Where(name => !string.IsNullOrWhiteSpace(name))).Trim();

		var items = receipt.Items
			.Where(item => !item.IsDeleted)
			.OrderBy(item => item.SortOrder)
			.Select(item => new PublicReceiptItemDto(
				item.Id,
				item.Name,
				item.Quantity,
				item.UnitPrice,
				item.TotalPrice,
				item.Barcode,
				item.VatRate,
				item.VatAmount,
				item.SortOrder))
			.ToList();

		var itemPhotos = receipt.ItemPhotos
			.Where(photo => !photo.IsDeleted)
			.OrderBy(photo => photo.SortOrder)
			.Select(photo => new PublicReceiptItemPhotoDto(
				photo.Id,
				photo.ReceiptItemId,
				photo.OriginalFileName,
				_fileStorage.ResolvePublicUrl(photo.StorageKey) ?? string.Empty,
				photo.SortOrder))
			.ToList();

		return ServiceResponse<PublicReceiptDetailDto>.Success(new PublicReceiptDetailDto(
			receipt.Id,
			receipt.MerchantName,
			receipt.TotalAmount,
			receipt.TransactionDate,
			receipt.Status.ToString(),
			_fileStorage.ResolvePublicUrl(receipt.StorageKey) ?? string.Empty,
			receipt.OcrStructuredPayloadJson,
			items,
			itemPhotos,
			string.IsNullOrWhiteSpace(addedByName) ? null : addedByName,
			receipt.CampaignId,
			receipt.Campaign?.Title,
			receipt.Campaign?.Organization?.Name,
			receipt.Campaign?.Organization?.Slug,
			verificationUrl,
			isConfirmed));
	}
}
