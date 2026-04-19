using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Purchases.Common;
using ProzoroBanka.Application.Purchases.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Purchases.Commands.ProcessDocumentOcr;

public class ProcessPurchaseDocumentOcrHandler : IRequestHandler<ProcessPurchaseDocumentOcrCommand, ServiceResponse<DocumentDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IDocumentOcrService _ocrService;
	private readonly IPurchaseDocumentOcrDispatcher _ocrDispatcher;

	public ProcessPurchaseDocumentOcrHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth,
		IDocumentOcrService ocrService,
		IPurchaseDocumentOcrDispatcher ocrDispatcher)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
		_ocrService = ocrService;
		_ocrDispatcher = ocrDispatcher;
	}

	public async Task<ServiceResponse<DocumentDto>> Handle(ProcessPurchaseDocumentOcrCommand request, CancellationToken ct)
	{
		var authResult = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			OrganizationPermissions.ManagePurchases,
			ct: ct);

		if (!authResult.IsSuccess)
			return ServiceResponse<DocumentDto>.Failure(authResult.Message);

		if (request.CampaignId.HasValue)
		{
			var campaignExists = await _db.Campaigns.AnyAsync(
				c => c.Id == request.CampaignId.Value && c.OrganizationId == request.OrganizationId,
				ct);

			if (!campaignExists)
				return ServiceResponse<DocumentDto>.Failure("Збір не знайдено в цій організації");
		}

		var document = await _db.CampaignDocuments
			.Include(d => d.Purchase)
			.FirstOrDefaultAsync(
				d => d.Id == request.DocumentId
					&& d.PurchaseId == request.PurchaseId
					&& d.Purchase.OrganizationId == request.OrganizationId
					&& (request.CampaignId == null || d.Purchase.CampaignId == request.CampaignId),
				ct);

		if (document is null)
			return ServiceResponse<DocumentDto>.Failure("Документ не знайдено");

		if (document.Type == DocumentType.TransferAct)
			return ServiceResponse<DocumentDto>.Failure("OCR не підтримується для Актів прийому-передачі.");

		if (document.OcrProcessingStatus == OcrProcessingStatus.Success)
			return ServiceResponse<DocumentDto>.Failure("Документ вже розпізнано.");

		try
		{
			document.OcrProcessingStatus = OcrProcessingStatus.Processing;
			await _db.SaveChangesAsync(ct);

			using var fileStream = await _fileStorage.OpenReadAsync(document.StorageKey, ct);

			var ocrResult = await _ocrService.ParseDocumentAsync(fileStream, document.OriginalFileName, document.Type, ct: ct);

			if (ocrResult.Success)
			{
				document.OcrProcessingStatus = OcrProcessingStatus.Success;
				await _ocrDispatcher.ApplyAsync(document, ocrResult, ct);
			}
			else
			{
				document.OcrProcessingStatus = OcrProcessingStatus.Failed;
			}
		}
		catch (Exception)
		{
			document.OcrProcessingStatus = OcrProcessingStatus.Failed;
		}

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<DocumentDto>.Success(PurchaseDtoMapper.ToDocumentDto(_fileStorage, document));
	}
}
