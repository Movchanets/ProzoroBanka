using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.UploadOrganizationReceiptDraft;

public class UploadOrganizationReceiptDraftHandler : IRequestHandler<UploadOrganizationReceiptDraftCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;
	private readonly IOrganizationAuthorizationService _orgAuth;

	public UploadOrganizationReceiptDraftHandler(
		IApplicationDbContext db,
		IFileStorage fileStorage,
		IOrganizationAuthorizationService orgAuth)
	{
		_db = db;
		_fileStorage = fileStorage;
		_orgAuth = orgAuth;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(UploadOrganizationReceiptDraftCommand request, CancellationToken ct)
	{
		var access = await _orgAuth.EnsureOrganizationAccessAsync(
			request.OrganizationId,
			request.CallerDomainUserId,
			requiredPermission: OrganizationPermissions.ManageReceipts,
			ct: ct);

		if (!access.IsSuccess)
			return ServiceResponse<ReceiptPipelineDto>.Failure(access.Message);

		request.FileStream.Position = 0;
		var storageKey = await _fileStorage.UploadAsync(request.FileStream, request.FileName, request.ContentType, ct);

		var receipt = new Receipt
		{
			UserId = request.CallerDomainUserId,
			OrganizationId = request.OrganizationId,
			StorageKey = storageKey,
			ReceiptImageStorageKey = storageKey,
			OriginalFileName = request.FileName,
			Status = ReceiptStatus.PendingOcr,
			PublicationStatus = ReceiptPublicationStatus.Draft
		};

		_db.Receipts.Add(receipt);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
