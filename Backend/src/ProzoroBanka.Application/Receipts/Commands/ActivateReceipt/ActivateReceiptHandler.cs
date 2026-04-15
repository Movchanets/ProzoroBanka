using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.Common;
using ProzoroBanka.Application.Receipts.DTOs;
using ProzoroBanka.Domain.Enums;

namespace ProzoroBanka.Application.Receipts.Commands.ActivateReceipt;

public class ActivateReceiptHandler : IRequestHandler<ActivateReceiptCommand, ServiceResponse<ReceiptPipelineDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IOrganizationAuthorizationService _orgAuth;
	private readonly IFileStorage _fileStorage;

	public ActivateReceiptHandler(IApplicationDbContext db, IOrganizationAuthorizationService orgAuth, IFileStorage fileStorage)
	{
		_db = db;
		_orgAuth = orgAuth;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<ReceiptPipelineDto>> Handle(ActivateReceiptCommand request, CancellationToken ct)
	{
		var receiptAccess = await _db.FindManageableOrganizationReceiptAsync(
			_orgAuth,
			request.ReceiptId,
			request.CallerDomainUserId,
			expectedOrganizationId: null,
			ct);

		if (!receiptAccess.IsSuccess)
			return ServiceResponse<ReceiptPipelineDto>.Failure(receiptAccess.Message);

		var receipt = receiptAccess.Payload!;

		if (receipt.Status != ReceiptStatus.StateVerified)
			return ServiceResponse<ReceiptPipelineDto>.Failure("Активувати можна тільки чек зі статусом StateVerified");

		receipt.PublicationStatus = ReceiptPublicationStatus.Active;
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<ReceiptPipelineDto>.Success(ReceiptDtoMapper.ToPipelineDto(_fileStorage, receipt));
	}
}
