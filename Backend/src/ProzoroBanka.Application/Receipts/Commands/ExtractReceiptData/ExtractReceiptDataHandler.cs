using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.ExtractReceiptData;

public class ExtractReceiptDataHandler : IRequestHandler<ExtractReceiptDataCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IOcrMonthlyQuotaService _ocrQuotaService;
	private readonly IOcrProcessingQueue _ocrQueue;
	private readonly IFileStorage _fileStorage;

	public ExtractReceiptDataHandler(
		IApplicationDbContext db,
		IOrganizationAuthorizationService orgAuth,
		IOcrMonthlyQuotaService ocrQuotaService,
		IOcrProcessingQueue ocrQueue,
		IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_ocrQuotaService = ocrQuotaService;
		_ocrQueue = ocrQueue;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ExtractReceiptDataCommand request, CancellationToken ct)
	{
		var receipt = await _db.FindOwnedWithPipelineGraphAsync(request.ReceiptId, request.CallerDomainUserId, ct);
		if (receipt is null)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Чек не знайдено");

		var isMember = await _orgAuth.IsMember(request.OrganizationId, request.CallerDomainUserId, ct);
		if (!isMember)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Користувач не є учасником організації");

		var quota = await _ocrQuotaService.TryConsumeAsync(request.OrganizationId, DateTime.UtcNow, ct);
		if (!quota.Allowed)
		{
			receipt.Status = ReceiptStatus.OcrDeferredMonthlyQuota;
			receipt.VerificationFailureReason = quota.Reason ?? "Місячний ліміт OCR вичерпано";
			await _db.SaveChangesAsync(ct);

			return ServiceResponse<ReceiptPipelineDto>.Failure(receipt.VerificationFailureReason);
		}

		// If a new file was provided in the request, upload it to storage first
		if (request.FileStream is not null)
		{
			var fileName = request.FileName ?? "receipt.webp";
			var contentType = GetContentType(fileName);
			var storageKey = await _fileStorage.UploadAsync(request.FileStream, fileName, contentType, ct);
			receipt.ReceiptImageStorageKey = storageKey;
			receipt.OriginalFileName ??= fileName;
		}

		// Validate that there's a file to process
		if (string.IsNullOrWhiteSpace(receipt.ReceiptImageStorageKey) && string.IsNullOrWhiteSpace(receipt.StorageKey))
			return ServiceResponse<ReceiptPipelineDto>.Failure("Для OCR потрібен файл чека");

		// Set status to PendingOcr and enqueue for background processing
		receipt.Status = ReceiptStatus.PendingOcr;
		receipt.VerificationFailureReason = null;
		await _db.SaveChangesAsync(ct);

		await _ocrQueue.EnqueueAsync(new OcrWorkItem(
			receipt.Id,
			request.OrganizationId,
			request.CallerDomainUserId,
			request.ModelIdentifier), ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}

	private static string GetContentType(string fileName) =>
		Path.GetExtension(fileName).ToLowerInvariant() switch
		{
			".jpg" or ".jpeg" => "image/jpeg",
			".png" => "image/png",
			".webp" => "image/webp",
			".pdf" => "application/pdf",
			_ => "application/octet-stream"
		};
}
